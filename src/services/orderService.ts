import { Order, IOrder, OrderItem, OrderPricing, PaymentInfo, StatusUpdate } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { InventoryService } from './inventoryService';
import { PricingService } from './pricingService';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';
import { OrderStatus, Address } from '../types/common';
import mongoose from 'mongoose';

export interface CreateOrderData {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentInfo['method'];
  discountCode?: string;
  notes?: string;
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  estimatedDelivery: Date | null;
}

export interface DeliveryEstimate {
  estimatedDate: Date;
  minDays: number;
  maxDays: number;
  shippingMethod: 'standard' | 'expedited' | 'overnight' | 'ground';
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface TrackingUpdate {
  timestamp: Date;
  location: string;
  status: string;
  description: string;
  carrier?: string;
}

export interface OrderTrackingDetails {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  trackingNumber?: string | undefined;
  carrier?: string | undefined;
  estimatedDelivery: DeliveryEstimate;
  statusHistory: StatusUpdate[];
  trackingUpdates: TrackingUpdate[];
  canBeCancelled: boolean;
  nextPossibleStatuses: OrderStatus[];
}

export interface OrderFilters {
  userId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: Record<OrderStatus, number>;
  recentOrders: OrderSummary[];
}

export class OrderService {
  /**
   * Create a new order with inventory validation and pricing calculation
   */
  static async createOrder(orderData: CreateOrderData): Promise<IOrder> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Validate user exists
        const user = await User.findById(orderData.userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        // Validate and prepare order items
        const orderItems: OrderItem[] = [];
        let subtotal = 0;

        for (const item of orderData.items) {
          const product = await Product.findById(item.productId).session(session);
          if (!product || !product.isActive) {
            throw new Error(`Product not found or inactive: ${item.productId}`);
          }

          // Check inventory availability
          const isAvailable = await InventoryService.checkAvailability(
            item.productId,
            item.quantity,
            orderData.userId,
            `order-creation-${Date.now()}`
          );

          if (!isAvailable) {
            throw new Error(`Insufficient stock for product: ${product.name} (${product.sku})`);
          }

          // Calculate pricing for this user
          const unitPrice = await PricingService.calculatePrice(
            item.productId,
            user.role,
            user.isWholesaleCustomer,
            orderData.discountCode,
            item.quantity
          );

          const totalPrice = unitPrice.finalPrice * item.quantity;

          orderItems.push({
            productId: item.productId,
            productName: product.name,
            sku: product.sku,
            quantity: item.quantity,
            unitPrice: unitPrice.finalPrice,
            totalPrice
          });

          subtotal += totalPrice;
        }

        // Calculate pricing breakdown
        const pricing: OrderPricing = {
          subtotal,
          discountAmount: 0,
          taxAmount: this.calculateTax(subtotal),
          shippingCost: this.calculateShipping(subtotal, orderData.shippingAddress),
          totalAmount: 0,
          discountCode: orderData.discountCode || undefined
        };

        // Apply discount if provided
        if (orderData.discountCode) {
          const discountResult = await PricingService.validateAndApplyDiscount(
            orderData.discountCode,
            subtotal,
            user.role
          );
          
          if (discountResult.valid) {
            pricing.discountAmount = discountResult.discountAmount || 0;
          }
        }

        // Calculate final total
        pricing.totalAmount = pricing.subtotal - pricing.discountAmount + 
                             pricing.taxAmount + pricing.shippingCost;

        // Create payment info
        const paymentInfo: PaymentInfo = {
          method: orderData.paymentMethod,
          status: 'pending',
          amount: pricing.totalAmount,
          currency: 'USD'
        };

        // Create the order
        const order = new Order({
          userId: orderData.userId,
          items: orderItems,
          pricing,
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress,
          status: 'pending',
          paymentInfo,
          notes: orderData.notes
        });

        await order.save({ session });

        // Reserve inventory for the order
        const reservationResult = await InventoryService.reserveStock(
          orderData.items,
          60, // 1 hour reservation
          order.orderNumber,
          orderData.userId
        );

        if (!reservationResult.success) {
          throw new Error('Failed to reserve inventory for order');
        }

        logger.info('Order created successfully', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          userId: orderData.userId,
          totalAmount: pricing.totalAmount,
          itemCount: orderItems.length
        });

        return order;
      });
    } catch (error) {
      logger.error('Order creation failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get order by ID with user validation
   */
  static async getOrderById(orderId: string, userId?: string | undefined): Promise<any> {
    try {
      const query: any = { _id: orderId };
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query)
        .populate('userId', 'firstName lastName email')
        .lean();

      return order;
    } catch (error) {
      logger.error('Get order by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string, userId?: string | undefined): Promise<any> {
    try {
      const query: any = { orderNumber };
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query)
        .populate('userId', 'firstName lastName email')
        .lean();

      return order;
    } catch (error) {
      logger.error('Get order by number failed:', error);
      throw error;
    }
  }

  /**
   * Get orders for a specific user
   */
  static async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus
  ): Promise<{
    orders: OrderSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = { userId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      const orderSummaries: OrderSummary[] = orders.map(order => ({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.pricing.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        estimatedDelivery: order.tracking.estimatedDelivery || null
      }));

      return {
        orders: orderSummaries,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get user orders failed:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updatedBy?: string,
    note?: string,
    trackingInfo?: {
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
    }
  ): Promise<IOrder> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new Error('Order not found');
        }

        // Store previous status for notification
        const previousStatus = order.status;

        // Validate status transition
        if (!this.isValidStatusTransition(order.status, status)) {
          throw new Error(`Invalid status transition from ${order.status} to ${status}`);
        }

        // Update order status
        order.updateStatus(status, note, updatedBy);

        // Update tracking information if provided
        if (trackingInfo) {
          if (trackingInfo.trackingNumber) {
            order.tracking.trackingNumber = trackingInfo.trackingNumber;
          }
          if (trackingInfo.carrier) {
            order.tracking.carrier = trackingInfo.carrier;
          }
          if (trackingInfo.estimatedDelivery) {
            order.tracking.estimatedDelivery = trackingInfo.estimatedDelivery;
          }
        }

        // Handle inventory changes based on status
        if (status === 'cancelled') {
          // Release reserved inventory
          await this.handleOrderCancellation(order, session);
        } else if (status === 'confirmed') {
          // Confirm inventory reservation and deduct from stock
          await this.handleOrderConfirmation(order, session);
        }

        await order.save({ session });

        // Send notification after successful status update
        try {
          await NotificationService.sendOrderStatusNotification(
            order,
            previousStatus,
            updatedBy
          );
        } catch (notificationError) {
          // Log notification error but don't fail the order update
          logger.error('Failed to send order status notification:', notificationError);
        }

        logger.info('Order status updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          oldStatus: previousStatus,
          newStatus: status,
          updatedBy
        });

        return order;
      });
    } catch (error) {
      logger.error('Update order status failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy?: string
  ): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.canBeCancelled()) {
        throw new Error(`Order cannot be cancelled in ${order.status} status`);
      }

      return await this.updateOrderStatus(
        orderId,
        'cancelled',
        cancelledBy,
        `Order cancelled: ${reason}`
      );
    } catch (error) {
      logger.error('Cancel order failed:', error);
      throw error;
    }
  }

  /**
   * Get orders with filters
   */
  static async getOrders(
    filters: OrderFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.status) query.status = filters.status;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      if (filters.minAmount || filters.maxAmount) {
        query['pricing.totalAmount'] = {};
        if (filters.minAmount) query['pricing.totalAmount'].$gte = filters.minAmount;
        if (filters.maxAmount) query['pricing.totalAmount'].$lte = filters.maxAmount;
      }

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get orders with filters failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed order tracking information
   */
  static async getOrderTracking(
    orderIdentifier: string,
    userId?: string
  ): Promise<OrderTrackingDetails | null> {
    try {
      // Try to find by order ID first, then by order number
      let order;
      if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
        const query: any = { _id: orderIdentifier };
        if (userId) query.userId = userId;
        order = await Order.findOne(query);
      } else {
        const query: any = { orderNumber: orderIdentifier };
        if (userId) query.userId = userId;
        order = await Order.findOne(query);
      }

      if (!order) {
        return null;
      }

      // Calculate delivery estimate
      const deliveryEstimate = this.calculateDeliveryEstimate(order);

      // Get next possible statuses
      const nextPossibleStatuses = this.getNextPossibleStatuses(order.status);

      // Simulate tracking updates (in a real system, this would come from carrier APIs)
      const trackingUpdates = this.generateTrackingUpdates(order);

      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        trackingNumber: order.tracking.trackingNumber,
        carrier: order.tracking.carrier,
        estimatedDelivery: deliveryEstimate,
        statusHistory: order.tracking.statusHistory,
        trackingUpdates,
        canBeCancelled: order.canBeCancelled(),
        nextPossibleStatuses
      };
    } catch (error) {
      logger.error('Get order tracking failed:', error);
      throw error;
    }
  }

  /**
   * Update order tracking information
   */
  static async updateOrderTracking(
    orderId: string,
    trackingData: {
      trackingNumber?: string;
      carrier?: string;
      currentLocation?: string;
      estimatedDelivery?: Date;
      trackingUpdate?: {
        location: string;
        status: string;
        description: string;
      };
    },
    updatedBy?: string
  ): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update tracking information
      if (trackingData.trackingNumber) {
        order.tracking.trackingNumber = trackingData.trackingNumber;
      }
      if (trackingData.carrier) {
        order.tracking.carrier = trackingData.carrier;
      }
      if (trackingData.currentLocation) {
        order.tracking.currentLocation = trackingData.currentLocation;
      }
      if (trackingData.estimatedDelivery) {
        order.tracking.estimatedDelivery = trackingData.estimatedDelivery;
      }

      // Add tracking update to history if provided
      if (trackingData.trackingUpdate) {
        // In a real implementation, tracking updates would be stored in a separate collection
        // For now, we'll add it to the status history
        order.tracking.statusHistory.push({
          status: order.status,
          timestamp: new Date(),
          note: `${trackingData.trackingUpdate.status}: ${trackingData.trackingUpdate.description} (${trackingData.trackingUpdate.location})`,
          updatedBy: updatedBy || 'system'
        });
      }

      await order.save();

      logger.info('Order tracking updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
        updatedBy
      });

      return order;
    } catch (error) {
      logger.error('Update order tracking failed:', error);
      throw error;
    }
  }

  /**
   * Get order history for a user
   */
  static async getOrderHistory(
    userId: string,
    filters: {
      status?: OrderStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<{
    orders: OrderSummary[];
    summary: {
      totalOrders: number;
      totalSpent: number;
      averageOrderValue: number;
      statusBreakdown: Record<OrderStatus, number>;
    };
  }> {
    try {
      const query: any = { userId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const limit = filters.limit || 50;

      const [orders, stats] = await Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),
        Order.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$pricing.totalAmount' },
              averageOrderValue: { $avg: '$pricing.totalAmount' },
              statusBreakdown: { $push: '$status' }
            }
          }
        ])
      ]);

      const orderSummaries: OrderSummary[] = orders.map((order: any) => ({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.pricing.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        estimatedDelivery: order.tracking.estimatedDelivery || null
      }));

      // Process status breakdown
      const statusBreakdown: Record<OrderStatus, number> = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      };

      if (stats[0]?.statusBreakdown) {
        stats[0].statusBreakdown.forEach((status: OrderStatus) => {
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });
      }

      const summary = {
        totalOrders: stats[0]?.totalOrders || 0,
        totalSpent: stats[0]?.totalSpent || 0,
        averageOrderValue: stats[0]?.averageOrderValue || 0,
        statusBreakdown
      };

      return {
        orders: orderSummaries,
        summary
      };
    } catch (error) {
      logger.error('Get order history failed:', error);
      throw error;
    }
  }

  /**
   * Bulk update order statuses (for admin operations)
   */
  static async bulkUpdateOrderStatus(
    orderIds: string[],
    status: OrderStatus,
    updatedBy: string,
    note?: string
  ): Promise<{
    successful: string[];
    failed: Array<{ orderId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ orderId: string; error: string }> = [];
    const updatedOrders: IOrder[] = [];

    for (const orderId of orderIds) {
      try {
        const updatedOrder = await this.updateOrderStatus(orderId, status, updatedBy, note);
        successful.push(orderId);
        updatedOrders.push(updatedOrder);
      } catch (error) {
        failed.push({
          orderId,
          error: (error as Error).message
        });
      }
    }

    // Send bulk notifications for successful updates
    if (updatedOrders.length > 0) {
      try {
        await NotificationService.sendBulkOrderNotifications(
          updatedOrders,
          status,
          updatedBy
        );
      } catch (notificationError) {
        logger.error('Failed to send bulk order notifications:', notificationError);
        // Don't fail the operation if notifications fail
      }
    }

    logger.info('Bulk order status update completed', {
      totalOrders: orderIds.length,
      successful: successful.length,
      failed: failed.length,
      status,
      updatedBy
    });

    return { successful, failed };
  }
  static async getOrderStats(startDate?: Date, endDate?: Date): Promise<OrderStats> {
    try {
      const matchStage: any = {};
      
      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: startDate,
          $lte: endDate
        };
      }

      const [statsResult, recentOrders] = await Promise.all([
        Order.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$pricing.totalAmount' },
              averageOrderValue: { $avg: '$pricing.totalAmount' },
              statusBreakdown: {
                $push: '$status'
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalOrders: 1,
              totalRevenue: 1,
              averageOrderValue: 1,
              statusCounts: {
                $reduce: {
                  input: '$statusBreakdown',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [
                          [{ k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }]
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        ]),
        Order.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      ]);

      const stats = statsResult[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {}
      };

      const recentOrderSummaries: OrderSummary[] = recentOrders.map((order: any) => ({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.pricing.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        estimatedDelivery: order.tracking.estimatedDelivery || null
      }));

      return {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        averageOrderValue: stats.averageOrderValue,
        statusCounts: stats.statusCounts,
        recentOrders: recentOrderSummaries
      };
    } catch (error) {
      logger.error('Get order stats failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static calculateDeliveryEstimate(order: IOrder): DeliveryEstimate {
    const now = new Date();
    const orderDate = order.createdAt;
    const factors: string[] = [];
    
    // Determine shipping method based on order value and customer type
    let shippingMethod: DeliveryEstimate['shippingMethod'] = 'standard';
    let baseDays = 7; // Standard shipping
    let confidence: DeliveryEstimate['confidence'] = 'high';

    // Expedited shipping for high-value orders
    if (order.pricing.totalAmount > 500) {
      shippingMethod = 'expedited';
      baseDays = 3;
      factors.push('High-value order qualifies for expedited shipping');
    }

    // Adjust based on order status
    switch (order.status) {
      case 'pending':
        baseDays += 2; // Processing time
        confidence = 'medium';
        factors.push('Order pending confirmation');
        break;
      case 'confirmed':
        baseDays += 1; // Reduced processing time
        factors.push('Order confirmed, preparing for shipment');
        break;
      case 'processing':
        factors.push('Order being processed');
        break;
      case 'shipped':
        baseDays = Math.max(1, baseDays - 2); // Already shipped
        factors.push('Order shipped, in transit');
        break;
      case 'delivered':
        baseDays = 0;
        factors.push('Order delivered');
        break;
      case 'cancelled':
        baseDays = 0;
        factors.push('Order cancelled');
        break;
    }

    // Weekend and holiday adjustments
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      baseDays += 1;
      factors.push('Weekend processing delay');
      confidence = 'medium';
    }

    // Calculate estimated date
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + baseDays);

    // Ensure estimated date is not in the past
    if (estimatedDate < now && order.status !== 'delivered') {
      estimatedDate.setTime(now.getTime() + (24 * 60 * 60 * 1000)); // Tomorrow
      factors.push('Adjusted for current date');
      confidence = 'low';
    }

    return {
      estimatedDate,
      minDays: Math.max(1, baseDays - 1),
      maxDays: baseDays + 2,
      shippingMethod,
      confidence,
      factors
    };
  }

  private static getNextPossibleStatuses(currentStatus: OrderStatus): OrderStatus[] {
    const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [], // Final state
      cancelled: [] // Final state
    };

    return statusTransitions[currentStatus] || [];
  }

  private static generateTrackingUpdates(order: IOrder): TrackingUpdate[] {
    // In a real implementation, this would fetch from carrier APIs
    // For now, generate mock tracking updates based on order status
    const updates: TrackingUpdate[] = [];
    const baseDate = order.createdAt;

    if (order.status === 'pending') {
      updates.push({
        timestamp: baseDate,
        location: 'Order Processing Center',
        status: 'Order Received',
        description: 'Your order has been received and is being processed'
      });
    }

    if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      updates.push({
        timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        location: 'Fulfillment Center',
        status: 'Order Confirmed',
        description: 'Your order has been confirmed and is being prepared for shipment'
      });
    }

    if (['processing', 'shipped', 'delivered'].includes(order.status)) {
      updates.push({
        timestamp: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000),
        location: 'Fulfillment Center',
        status: 'Processing',
        description: 'Your order is being picked and packed'
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      updates.push({
        timestamp: new Date(baseDate.getTime() + 72 * 60 * 60 * 1000),
        location: 'Distribution Center',
        status: 'Shipped',
        description: 'Your order has been shipped',
        carrier: order.tracking.carrier || 'Standard Carrier'
      });

      // Add in-transit updates for shipped orders
      if (order.status === 'shipped') {
        updates.push({
          timestamp: new Date(baseDate.getTime() + 96 * 60 * 60 * 1000),
          location: 'In Transit',
          status: 'Out for Delivery',
          description: 'Your package is out for delivery',
          carrier: order.tracking.carrier || 'Standard Carrier'
        });
      }
    }

    if (order.status === 'delivered') {
      updates.push({
        timestamp: new Date(baseDate.getTime() + 120 * 60 * 60 * 1000),
        location: 'Customer Address',
        status: 'Delivered',
        description: 'Your order has been delivered',
        carrier: order.tracking.carrier || 'Standard Carrier'
      });
    }

    return updates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private static calculateTax(subtotal: number): number {
    // Simple tax calculation - 8.5% sales tax
    // In a real application, this would be based on shipping address and tax rules
    return Math.round(subtotal * 0.085 * 100) / 100;
  }

  private static calculateShipping(subtotal: number, address: Address): number {
    // Simple shipping calculation
    // Free shipping over $100, otherwise $9.99
    if (subtotal >= 100) {
      return 0;
    }
    return 9.99;
  }

  private static isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [], // Final state
      cancelled: [] // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private static async handleOrderCancellation(order: IOrder, session: mongoose.ClientSession): Promise<void> {
    // Release any reserved inventory
    try {
      // In a real implementation, we would look up the reservation ID and release it
      // For now, we'll just log the cancellation
      logger.info('Order cancelled - inventory reservation should be released', {
        orderId: order._id,
        orderNumber: order.orderNumber
      });
    } catch (error) {
      logger.error('Failed to release inventory on order cancellation:', error);
      // Don't throw - order cancellation should still proceed
    }
  }

  private static async handleOrderConfirmation(order: IOrder, session: mongoose.ClientSession): Promise<void> {
    // Convert reservation to actual inventory deduction
    try {
      for (const item of order.items) {
        await InventoryService.updateStock(
          item.productId,
          item.quantity,
          'sale',
          `Order confirmed: ${order.orderNumber}`,
          'system',
          order.orderNumber
        );
      }

      logger.info('Order confirmed - inventory deducted', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        itemCount: order.items.length
      });
    } catch (error) {
      logger.error('Failed to deduct inventory on order confirmation:', error);
      throw error; // This should prevent order confirmation
    }
  }
}