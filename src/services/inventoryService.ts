import { Product, IProduct } from '../models/Product';
import { logger } from '../utils/logger';
import { AlertService, OversellAttempt } from './alertService';
import { NotificationService } from './notificationService';
import mongoose from 'mongoose';

export interface InventoryUpdate {
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  availableQuantity: number;
  reserved: number;
  change: number;
  type: 'add' | 'subtract' | 'set' | 'sale' | 'restock' | 'adjustment';
  reason?: string | undefined;
  updatedBy?: string | undefined;
  timestamp: Date;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string | undefined;
  reservedItems: Array<{
    productId: string;
    quantity: number;
    reserved: boolean;
    reason?: string;
  }>;
  totalReserved: number;
  expiresAt?: Date | undefined;
}

export interface LowStockAlert {
  productId: string;
  sku: string;
  name: string;
  currentQuantity: number;
  availableQuantity: number;
  reserved: number;
  lowStockThreshold: number;
  category: string;
  brand: string;
  severity: 'low' | 'critical' | 'out_of_stock';
  alertDate: Date;
}

export interface InventoryMovement {
  productId: string;
  sku: string;
  type: 'in' | 'out' | 'reserved' | 'released' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string | undefined; // Order ID, Purchase Order, etc.
  updatedBy?: string | undefined;
  timestamp: Date;
  balanceAfter: number;
  availableAfter: number;
}

export interface StockReservation {
  reservationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  reference?: string | undefined;
}

export class InventoryService {
  /**
   * Update stock with detailed tracking
   */
  static async updateStock(
    productId: string, 
    quantity: number, 
    type: 'add' | 'subtract' | 'set' | 'sale' | 'restock' | 'adjustment' = 'set',
    reason?: string,
    updatedBy?: string,
    reference?: string
  ): Promise<InventoryUpdate> {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        const product = await Product.findById(productId).session(session);
        
        if (!product) {
          throw new Error('Product not found');
        }

        const oldQuantity = product.inventory.quantity;
        let newQuantity = oldQuantity;
        let change = 0;

        switch (type) {
          case 'add':
          case 'restock':
            newQuantity = oldQuantity + quantity;
            change = quantity;
            break;
          case 'subtract':
          case 'sale':
            newQuantity = Math.max(0, oldQuantity - quantity);
            change = -(oldQuantity - newQuantity);
            break;
          case 'set':
          case 'adjustment':
            newQuantity = Math.max(0, quantity);
            change = newQuantity - oldQuantity;
            break;
        }

        product.inventory.quantity = newQuantity;
        await product.save({ session });

        // Log inventory movement
        await this.logInventoryMovement({
          productId: product._id.toString(),
          sku: product.sku,
          type: type === 'add' || type === 'restock' ? 'in' : 
                type === 'subtract' || type === 'sale' ? 'out' : 'adjustment',
          quantity: Math.abs(change),
          reason: reason || `Inventory ${type}`,
          reference: reference || undefined,
          updatedBy: updatedBy || undefined,
          timestamp: new Date(),
          balanceAfter: newQuantity,
          availableAfter: product.getAvailableQuantity()
        });

        logger.info('Inventory updated with tracking', {
          productId: product._id,
          sku: product.sku,
          oldQuantity,
          newQuantity,
          change,
          type,
          reason,
          updatedBy,
          reference
        });
      });

      // Fetch updated product outside transaction
      const updatedProduct = await Product.findById(productId);
      if (!updatedProduct) {
        throw new Error('Product not found after update');
      }

      // Check for low stock and send notifications if needed
      const availableQuantity = updatedProduct.getAvailableQuantity();
      const threshold = updatedProduct.inventory.lowStockThreshold;
      
      if (updatedProduct.inventory.trackInventory && availableQuantity <= threshold) {
        try {
          await NotificationService.sendInventoryAlert(
            updatedProduct._id.toString(),
            updatedProduct.name,
            availableQuantity,
            threshold
          );
        } catch (notificationError) {
          // Log notification error but don't fail the inventory update
          logger.error('Failed to send inventory alert notification:', notificationError);
        }
      }

      return {
        productId: updatedProduct._id.toString(),
        oldQuantity: 0, // Simplified for now since getLastInventoryMovement returns null
        newQuantity: updatedProduct.inventory.quantity,
        availableQuantity: updatedProduct.getAvailableQuantity(),
        reserved: updatedProduct.inventory.reserved,
        change: quantity,
        type,
        reason: reason || undefined,
        updatedBy: updatedBy || undefined,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Stock update failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Check real-time availability with overselling prevention
   */
  static async checkAvailability(
    productId: string, 
    requestedQuantity: number,
    userId?: string,
    orderReference?: string
  ): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      
      if (!product || !product.isActive) {
        return false;
      }

      if (!product.inventory.trackInventory) {
        return true; // Always available if not tracking inventory
      }

      const availableQuantity = product.getAvailableQuantity();
      const isAvailable = availableQuantity >= requestedQuantity;

      // Log overselling attempt if stock is insufficient
      if (!isAvailable) {
        const oversellAttempt: OversellAttempt = {
          productId: product._id.toString(),
          sku: product.sku,
          productName: product.name,
          requestedQuantity,
          availableQuantity,
          attemptedBy: userId,
          timestamp: new Date(),
          orderReference
        };

        // Generate alert for overselling attempt
        await AlertService.generateOversellAlert(oversellAttempt);

        logger.warn('Overselling attempt detected and prevented', {
          productId: product._id,
          sku: product.sku,
          requestedQuantity,
          availableQuantity,
          userId,
          orderReference
        });
      }

      return isAvailable;
    } catch (error) {
      logger.error('Availability check failed:', error);
      return false;
    }
  }

  /**
   * Reserve stock for orders with overselling prevention
   */
  static async reserveStock(
    items: Array<{ productId: string; quantity: number }>,
    expirationMinutes: number = 30,
    reference?: string,
    userId?: string
  ): Promise<ReservationResult> {
    const session = await mongoose.startSession();
    const reservationId = new mongoose.Types.ObjectId().toString();
    
    try {
      const result = await session.withTransaction(async () => {
        const reservedItems: ReservationResult['reservedItems'] = [];
        let totalReserved = 0;

        // First pass: Check availability for all items to prevent partial reservations
        for (const item of items) {
          const isAvailable = await this.checkAvailability(
            item.productId, 
            item.quantity, 
            userId, 
            reference
          );
          
          if (!isAvailable) {
            const product = await Product.findById(item.productId);
            const productName = product ? product.name : 'Unknown Product';
            const sku = product ? product.sku : 'Unknown SKU';
            
            logger.warn('Reservation failed due to insufficient stock', {
              productId: item.productId,
              sku,
              requestedQuantity: item.quantity,
              availableQuantity: product ? product.getAvailableQuantity() : 0,
              reservationId,
              userId,
              reference
            });

            // Return early with failure for any unavailable item
            return {
              success: false,
              reservationId: undefined,
              reservedItems: [{
                productId: item.productId,
                quantity: item.quantity,
                reserved: false,
                reason: `Insufficient stock. Available: ${product ? product.getAvailableQuantity() : 0}`
              }],
              totalReserved: 0,
              expiresAt: undefined
            };
          }
        }

        // Second pass: Reserve all items (we know they're all available)
        for (const item of items) {
          const product = await Product.findById(item.productId).session(session);
          
          if (!product) {
            reservedItems.push({
              productId: item.productId,
              quantity: item.quantity,
              reserved: false,
              reason: 'Product not found'
            });
            continue;
          }

          // Double-check availability within transaction
          if (!product.isInStock(item.quantity)) {
            reservedItems.push({
              productId: item.productId,
              quantity: item.quantity,
              reserved: false,
              reason: 'Insufficient stock (concurrent modification)'
            });
            continue;
          }

          // Reserve the stock
          product.inventory.reserved += item.quantity;
          await product.save({ session });

          // Log reservation movement
          await this.logInventoryMovement({
            productId: product._id.toString(),
            sku: product.sku,
            type: 'reserved',
            quantity: item.quantity,
            reason: `Stock reserved - ${reservationId}`,
            reference: reference || undefined,
            updatedBy: userId,
            timestamp: new Date(),
            balanceAfter: product.inventory.quantity,
            availableAfter: product.getAvailableQuantity()
          });

          reservedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            reserved: true
          });

          totalReserved += item.quantity;
        }

        // Store reservation record
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
        await this.storeReservation({
          reservationId,
          items: items.filter(item => 
            reservedItems.find(r => r.productId === item.productId && r.reserved)
          ),
          createdAt: new Date(),
          expiresAt,
          status: 'active',
          reference: reference || undefined
        });

        return {
          success: reservedItems.some(item => item.reserved),
          reservationId,
          reservedItems,
          totalReserved,
          expiresAt
        };
      });

      logger.info('Stock reservation completed', {
        reservationId,
        totalItems: items.length,
        totalReserved: result.totalReserved,
        success: result.success,
        reference,
        userId
      });

      return result;
    } catch (error) {
      logger.error('Stock reservation failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Release reserved stock
   */
  static async releaseReservation(reservationId: string): Promise<boolean> {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        const reservation = await this.getReservation(reservationId);
        
        if (!reservation || reservation.status !== 'active') {
          throw new Error('Reservation not found or not active');
        }

        for (const item of reservation.items) {
          const product = await Product.findById(item.productId).session(session);
          
          if (product) {
            product.inventory.reserved = Math.max(0, product.inventory.reserved - item.quantity);
            await product.save({ session });

            // Log release movement
            await this.logInventoryMovement({
              productId: product._id.toString(),
              sku: product.sku,
              type: 'released',
              quantity: item.quantity,
              reason: `Reservation released - ${reservationId}`,
              timestamp: new Date(),
              balanceAfter: product.inventory.quantity,
              availableAfter: product.getAvailableQuantity()
            });
          }
        }

        // Update reservation status
        await this.updateReservationStatus(reservationId, 'cancelled');
      });

      logger.info('Reservation released', { reservationId });
      return true;
    } catch (error) {
      logger.error('Reservation release failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get low stock alerts with automatic alert generation
   */
  static async getLowStockAlerts(generateAlerts: boolean = true): Promise<LowStockAlert[]> {
    try {
      const lowStockProducts = await Product.aggregate([
        {
          $match: {
            isActive: true,
            'inventory.trackInventory': true,
            $expr: {
              $lte: [
                { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                '$inventory.lowStockThreshold'
              ]
            }
          }
        },
        {
          $addFields: {
            availableQuantity: { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
            severity: {
              $cond: {
                if: { $eq: [{ $subtract: ['$inventory.quantity', '$inventory.reserved'] }, 0] },
                then: 'out_of_stock',
                else: {
                  $cond: {
                    if: { 
                      $lte: [
                        { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                        { $multiply: ['$inventory.lowStockThreshold', 0.5] }
                      ]
                    },
                    then: 'critical',
                    else: 'low'
                  }
                }
              }
            }
          }
        },
        {
          $sort: { severity: -1, availableQuantity: 1 }
        }
      ]);

      const alerts: LowStockAlert[] = lowStockProducts.map(product => ({
        productId: product._id.toString(),
        sku: product.sku,
        name: product.name,
        currentQuantity: product.inventory.quantity,
        availableQuantity: product.availableQuantity,
        reserved: product.inventory.reserved,
        lowStockThreshold: product.inventory.lowStockThreshold,
        category: product.category,
        brand: product.brand,
        severity: product.severity,
        alertDate: new Date()
      }));

      // Generate alerts for admin/employee notification if requested
      if (generateAlerts && alerts.length > 0) {
        await AlertService.generateLowStockAlerts(alerts);
        
        logger.info('Low stock alerts generated', {
          totalAlerts: alerts.length,
          outOfStock: alerts.filter(a => a.severity === 'out_of_stock').length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          low: alerts.filter(a => a.severity === 'low').length
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Get low stock alerts failed:', error);
      throw error;
    }
  }

  /**
   * Prevent overselling by validating order before processing
   */
  static async validateOrderQuantities(
    items: Array<{ productId: string; quantity: number }>,
    userId?: string,
    orderReference?: string
  ): Promise<{
    valid: boolean;
    errors: Array<{
      productId: string;
      sku: string;
      productName: string;
      requestedQuantity: number;
      availableQuantity: number;
      error: string;
    }>;
  }> {
    const errors: any[] = [];
    
    try {
      for (const item of items) {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          errors.push({
            productId: item.productId,
            sku: 'UNKNOWN',
            productName: 'Unknown Product',
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            error: 'Product not found'
          });
          continue;
        }

        if (!product.isActive) {
          errors.push({
            productId: item.productId,
            sku: product.sku,
            productName: product.name,
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            error: 'Product is not active'
          });
          continue;
        }

        if (product.inventory.trackInventory) {
          const availableQuantity = product.getAvailableQuantity();
          
          if (availableQuantity < item.quantity) {
            // Log overselling attempt
            const oversellAttempt: OversellAttempt = {
              productId: product._id.toString(),
              sku: product.sku,
              productName: product.name,
              requestedQuantity: item.quantity,
              availableQuantity,
              attemptedBy: userId,
              timestamp: new Date(),
              orderReference
            };

            await AlertService.generateOversellAlert(oversellAttempt);

            errors.push({
              productId: item.productId,
              sku: product.sku,
              productName: product.name,
              requestedQuantity: item.quantity,
              availableQuantity,
              error: `Insufficient stock. Available: ${availableQuantity}, Requested: ${item.quantity}`
            });
          }
        }
      }

      const isValid = errors.length === 0;
      
      if (!isValid) {
        logger.warn('Order validation failed - overselling prevented', {
          totalItems: items.length,
          errorCount: errors.length,
          userId,
          orderReference,
          errors: errors.map(e => ({
            productId: e.productId,
            sku: e.sku,
            requestedQuantity: e.requestedQuantity,
            availableQuantity: e.availableQuantity
          }))
        });
      }

      return {
        valid: isValid,
        errors
      };
    } catch (error) {
      logger.error('Order validation failed:', error);
      throw error;
    }
  }

  /**
   * Monitor inventory levels and trigger alerts
   */
  static async monitorInventoryLevels(): Promise<{
    lowStockCount: number;
    criticalStockCount: number;
    outOfStockCount: number;
    alertsGenerated: number;
  }> {
    try {
      const lowStockAlerts = await this.getLowStockAlerts(true);
      
      const lowStockCount = lowStockAlerts.filter(a => a.severity === 'low').length;
      const criticalStockCount = lowStockAlerts.filter(a => a.severity === 'critical').length;
      const outOfStockCount = lowStockAlerts.filter(a => a.severity === 'out_of_stock').length;

      logger.info('Inventory monitoring completed', {
        totalProducts: lowStockAlerts.length,
        lowStockCount,
        criticalStockCount,
        outOfStockCount
      });

      return {
        lowStockCount,
        criticalStockCount,
        outOfStockCount,
        alertsGenerated: lowStockAlerts.length
      };
    } catch (error) {
      logger.error('Inventory monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Get overselling prevention statistics
   */
  static async getOversellPreventionStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalAttempts: number;
    preventedValue: number;
    topProducts: Array<{
      productId: string;
      sku: string;
      productName: string;
      attemptCount: number;
      totalQuantityPrevented: number;
    }>;
  }> {
    try {
      // In a real implementation, this would query a database of oversell attempts
      // For now, we'll return placeholder data
      
      logger.info('Oversell prevention stats requested', { startDate, endDate });
      
      return {
        totalAttempts: 0,
        preventedValue: 0,
        topProducts: []
      };
    } catch (error) {
      logger.error('Get oversell prevention stats failed:', error);
      throw error;
    }
  }
  static async getInventoryMovements(
    productId: string,
    limit: number = 50
  ): Promise<InventoryMovement[]> {
    try {
      // This would typically query a separate inventory_movements collection
      // For now, we'll return a placeholder implementation
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // In a real implementation, this would query the movements collection
      return [];
    } catch (error) {
      logger.error('Get inventory movements failed:', error);
      throw error;
    }
  }

  /**
   * Bulk inventory update
   */
  static async bulkUpdateInventory(
    updates: Array<{
      productId: string;
      quantity: number;
      type: 'add' | 'subtract' | 'set';
      reason?: string;
    }>,
    updatedBy?: string
  ): Promise<InventoryUpdate[]> {
    const results: InventoryUpdate[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateStock(
          update.productId,
          update.quantity,
          update.type,
          update.reason,
          updatedBy
        );
        results.push(result);
      } catch (error) {
        logger.error(`Bulk update failed for product ${update.productId}:`, error);
        // Continue with other updates
      }
    }

    logger.info('Bulk inventory update completed', {
      totalUpdates: updates.length,
      successfulUpdates: results.length,
      updatedBy
    });

    return results;
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalReserved: number;
    categories: Array<{
      category: string;
      productCount: number;
      totalValue: number;
      lowStockCount: number;
    }>;
  }> {
    try {
      const [summary] = await Product.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalValue: { 
              $sum: { 
                $multiply: ['$inventory.quantity', '$pricing.costPrice'] 
              } 
            },
            totalReserved: { $sum: '$inventory.reserved' },
            lowStockCount: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$inventory.trackInventory', true] },
                      {
                        $lte: [
                          { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                          '$inventory.lowStockThreshold'
                        ]
                      }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: [
                      { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                      0
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        }
      ]);

      const categories = await Product.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$category',
            productCount: { $sum: 1 },
            totalValue: { 
              $sum: { 
                $multiply: ['$inventory.quantity', '$pricing.costPrice'] 
              } 
            },
            lowStockCount: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$inventory.trackInventory', true] },
                      {
                        $lte: [
                          { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                          '$inventory.lowStockThreshold'
                        ]
                      }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            category: '$_id',
            productCount: 1,
            totalValue: 1,
            lowStockCount: 1,
            _id: 0
          }
        },
        {
          $sort: { totalValue: -1 }
        }
      ]);

      return {
        totalProducts: summary?.totalProducts || 0,
        totalValue: summary?.totalValue || 0,
        lowStockCount: summary?.lowStockCount || 0,
        outOfStockCount: summary?.outOfStockCount || 0,
        totalReserved: summary?.totalReserved || 0,
        categories
      };
    } catch (error) {
      logger.error('Get inventory summary failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async logInventoryMovement(movement: InventoryMovement): Promise<void> {
    // In a real implementation, this would save to an inventory_movements collection
    logger.info('Inventory movement logged', movement);
  }

  private static async getLastInventoryMovement(productId: string): Promise<InventoryMovement | null> {
    // In a real implementation, this would query the movements collection
    return null;
  }

  private static async storeReservation(reservation: StockReservation): Promise<void> {
    // In a real implementation, this would save to a reservations collection
    logger.info('Reservation stored', reservation);
  }

  private static async getReservation(reservationId: string): Promise<StockReservation | null> {
    // In a real implementation, this would query the reservations collection
    return null;
  }

  private static async updateReservationStatus(
    reservationId: string, 
    status: StockReservation['status']
  ): Promise<void> {
    // In a real implementation, this would update the reservations collection
    logger.info('Reservation status updated', { reservationId, status });
  }
}