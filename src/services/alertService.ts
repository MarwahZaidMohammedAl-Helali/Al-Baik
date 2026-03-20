import { logger } from '../utils/logger';
import { LowStockAlert } from './inventoryService';

export interface AlertNotification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overselling_attempt' | 'inventory_critical';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetRoles: ('admin' | 'employee')[];
  data: any;
  createdAt: Date;
  readBy: string[]; // User IDs who have read this alert
  isActive: boolean;
}

export interface OversellAttempt {
  productId: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  attemptedBy?: string | undefined;
  timestamp: Date;
  orderReference?: string | undefined;
}

export class AlertService {
  private static alerts: AlertNotification[] = [];

  /**
   * Generate low stock alerts for admin and employee users
   */
  static async generateLowStockAlerts(lowStockProducts: LowStockAlert[]): Promise<AlertNotification[]> {
    const alerts: AlertNotification[] = [];

    for (const product of lowStockProducts) {
      const alertId = `low_stock_${product.productId}_${Date.now()}`;
      
      let alertType: AlertNotification['type'] = 'low_stock';
      let severity: AlertNotification['severity'] = 'low';
      let title = 'Low Stock Alert';
      
      if (product.severity === 'out_of_stock') {
        alertType = 'out_of_stock';
        severity = 'critical';
        title = 'Out of Stock Alert';
      } else if (product.severity === 'critical') {
        alertType = 'inventory_critical';
        severity = 'high';
        title = 'Critical Stock Level';
      }

      const alert: AlertNotification = {
        id: alertId,
        type: alertType,
        title,
        message: this.generateStockAlertMessage(product),
        severity,
        targetRoles: ['admin', 'employee'],
        data: {
          productId: product.productId,
          sku: product.sku,
          productName: product.name,
          currentQuantity: product.currentQuantity,
          availableQuantity: product.availableQuantity,
          reserved: product.reserved,
          lowStockThreshold: product.lowStockThreshold,
          category: product.category,
          brand: product.brand
        },
        createdAt: new Date(),
        readBy: [],
        isActive: true
      };

      alerts.push(alert);
      this.alerts.push(alert);

      logger.warn('Low stock alert generated', {
        alertId,
        productId: product.productId,
        sku: product.sku,
        severity: product.severity,
        availableQuantity: product.availableQuantity,
        threshold: product.lowStockThreshold
      });
    }

    return alerts;
  }

  /**
   * Generate overselling prevention alert
   */
  static async generateOversellAlert(attempt: OversellAttempt): Promise<AlertNotification> {
    const alertId = `oversell_${attempt.productId}_${Date.now()}`;
    
    const alert: AlertNotification = {
      id: alertId,
      type: 'overselling_attempt',
      title: 'Overselling Attempt Prevented',
      message: this.generateOversellAlertMessage(attempt),
      severity: 'high',
      targetRoles: ['admin', 'employee'],
      data: {
        productId: attempt.productId,
        sku: attempt.sku,
        productName: attempt.productName,
        requestedQuantity: attempt.requestedQuantity,
        availableQuantity: attempt.availableQuantity,
        attemptedBy: attempt.attemptedBy,
        orderReference: attempt.orderReference,
        timestamp: attempt.timestamp
      },
      createdAt: new Date(),
      readBy: [],
      isActive: true
    };

    this.alerts.push(alert);

    logger.error('Overselling attempt prevented', {
      alertId,
      productId: attempt.productId,
      sku: attempt.sku,
      requestedQuantity: attempt.requestedQuantity,
      availableQuantity: attempt.availableQuantity,
      attemptedBy: attempt.attemptedBy,
      orderReference: attempt.orderReference
    });

    return alert;
  }

  /**
   * Get active alerts for specific roles
   */
  static async getAlertsForRoles(roles: ('admin' | 'employee')[]): Promise<AlertNotification[]> {
    return this.alerts.filter(alert => 
      alert.isActive && 
      alert.targetRoles.some(role => roles.includes(role))
    ).sort((a, b) => {
      // Sort by severity (critical first) then by creation date (newest first)
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Mark alert as read by user
   */
  static async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    if (!alert.readBy.includes(userId)) {
      alert.readBy.push(userId);
    }

    logger.info('Alert marked as read', { alertId, userId });
    return true;
  }

  /**
   * Dismiss alert (mark as inactive)
   */
  static async dismissAlert(alertId: string, dismissedBy: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.isActive = false;
    logger.info('Alert dismissed', { alertId, dismissedBy });
    return true;
  }

  /**
   * Get alert statistics
   */
  static async getAlertStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unread: number;
  }> {
    const activeAlerts = this.alerts.filter(a => a.isActive);
    
    const byType = activeAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = activeAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unread = activeAlerts.filter(alert => alert.readBy.length === 0).length;

    return {
      total: activeAlerts.length,
      byType,
      bySeverity,
      unread
    };
  }

  /**
   * Clean up old alerts (older than 30 days)
   */
  static async cleanupOldAlerts(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      alert.createdAt > thirtyDaysAgo || alert.isActive
    );

    const removedCount = initialCount - this.alerts.length;
    
    if (removedCount > 0) {
      logger.info('Old alerts cleaned up', { removedCount });
    }

    return removedCount;
  }

  // Private helper methods

  private static generateStockAlertMessage(product: LowStockAlert): string {
    if (product.severity === 'out_of_stock') {
      return `Product "${product.name}" (${product.sku}) is out of stock. ` +
             `Current quantity: ${product.availableQuantity}, Reserved: ${product.reserved}. ` +
             `Immediate restocking required.`;
    } else if (product.severity === 'critical') {
      return `Product "${product.name}" (${product.sku}) has critically low stock. ` +
             `Available: ${product.availableQuantity}, Threshold: ${product.lowStockThreshold}. ` +
             `Urgent restocking recommended.`;
    } else {
      return `Product "${product.name}" (${product.sku}) is running low on stock. ` +
             `Available: ${product.availableQuantity}, Threshold: ${product.lowStockThreshold}. ` +
             `Consider restocking soon.`;
    }
  }

  private static generateOversellAlertMessage(attempt: OversellAttempt): string {
    return `Overselling attempt prevented for product "${attempt.productName}" (${attempt.sku}). ` +
           `Requested: ${attempt.requestedQuantity}, Available: ${attempt.availableQuantity}. ` +
           `${attempt.attemptedBy ? `Attempted by: ${attempt.attemptedBy}. ` : ''}` +
           `${attempt.orderReference ? `Order reference: ${attempt.orderReference}.` : ''}`;
  }
}