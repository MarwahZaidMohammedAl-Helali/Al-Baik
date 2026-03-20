import { logger } from '../utils/logger';
import { IOrder } from '../models/Order';
import { User } from '../models/User';
import { OrderStatus } from '../types/common';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  priority: NotificationPriority;
}

export interface OrderNotificationData extends NotificationData {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
}

export enum NotificationType {
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  INVENTORY_ALERT = 'inventory_alert',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  GENERAL = 'general'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'in_app';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  orderUpdates: boolean;
  promotions: boolean;
  inventoryAlerts: boolean;
  quietHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: string;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channels: string[];
  results: NotificationResult[];
  sentAt: Date;
  readAt?: Date;
  data?: Record<string, any>;
}

/**
 * Notification Service for handling all types of notifications
 * Supports multiple channels: push notifications, email, SMS, in-app
 */
export class NotificationService {
  private static pushNotificationConfig = {
    fcmServerKey: process.env.FCM_SERVER_KEY,
    apnsKeyId: process.env.APNS_KEY_ID,
    apnsTeamId: process.env.APNS_TEAM_ID
  };

  /**
   * Send order status update notification to customer
   */
  static async sendOrderStatusNotification(
    order: IOrder,
    previousStatus: OrderStatus,
    updatedBy?: string
  ): Promise<NotificationResult[]> {
    try {
      // Get user information
      const user = await User.findById(order.userId);
      if (!user) {
        throw new Error('User not found for order notification');
      }

      // Generate notification content based on status
      const notificationContent = this.generateOrderStatusContent(
        order,
        previousStatus,
        updatedBy
      );

      // Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(order.userId.toString());

      // Check if user wants order update notifications
      if (!preferences.orderUpdates) {
        logger.info('User has disabled order update notifications', {
          userId: order.userId,
          orderId: order._id
        });
        return [];
      }

      // Send notifications through enabled channels
      const results: NotificationResult[] = [];
      
      for (const channel of preferences.channels) {
        if (channel.enabled) {
          try {
            let result: NotificationResult;
            
            switch (channel.type) {
              case 'push':
                result = await this.sendPushNotification(user, notificationContent);
                break;
              case 'email':
                result = await this.sendEmailNotification(user, notificationContent);
                break;
              case 'sms':
                result = await this.sendSMSNotification(user, notificationContent);
                break;
              case 'in_app':
                result = await this.sendInAppNotification(user, notificationContent);
                break;
              default:
                continue;
            }
            
            results.push(result);
          } catch (error) {
            logger.error(`Failed to send ${channel.type} notification:`, error);
            results.push({
              success: false,
              error: (error as Error).message,
              channel: channel.type
            });
          }
        }
      }

      // Store notification history
      await this.storeNotificationHistory({
        userId: order.userId.toString(),
        title: notificationContent.title,
        message: notificationContent.message,
        type: notificationContent.type,
        channels: preferences.channels.filter(c => c.enabled).map(c => c.type),
        results,
        sentAt: new Date(),
        data: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          previousStatus,
          updatedBy
        }
      });

      logger.info('Order status notification sent', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        status: order.status,
        previousStatus,
        channelResults: results.map(r => ({ channel: r.channel, success: r.success }))
      });

      return results;
    } catch (error) {
      logger.error('Failed to send order status notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications for multiple orders (admin operations)
   */
  static async sendBulkOrderNotifications(
    orders: IOrder[],
    status: OrderStatus,
    updatedBy: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const notificationResults = await this.sendOrderStatusNotification(
          order,
          order.status, // Previous status is current since we're about to update
          updatedBy
        );
        
        results.push({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          success: true,
          notifications: notificationResults
        });
        successful++;
      } catch (error) {
        results.push({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          success: false,
          error: (error as Error).message
        });
        failed++;
      }
    }

    logger.info('Bulk order notifications completed', {
      totalOrders: orders.length,
      successful,
      failed,
      status,
      updatedBy
    });

    return { successful, failed, results };
  }

  /**
   * Send inventory alert notifications to admin and employees
   */
  static async sendInventoryAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number
  ): Promise<NotificationResult[]> {
    try {
      // Get admin and employee users
      const adminUsers = await User.find({ 
        role: { $in: ['admin', 'employee'] },
        isActive: true 
      });

      const results: NotificationResult[] = [];

      for (const user of adminUsers) {
        const preferences = await this.getUserNotificationPreferences(user._id.toString());
        
        if (!preferences.inventoryAlerts) {
          continue;
        }

        const notificationContent: NotificationData = {
          userId: user._id.toString(),
          title: 'Low Stock Alert',
          message: `${productName} is running low. Current stock: ${currentStock} (threshold: ${threshold})`,
          type: NotificationType.INVENTORY_ALERT,
          priority: currentStock === 0 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
          data: {
            productId,
            productName,
            currentStock,
            threshold,
            isOutOfStock: currentStock === 0
          }
        };

        // Send through enabled channels
        for (const channel of preferences.channels) {
          if (channel.enabled) {
            try {
              let result: NotificationResult;
              
              switch (channel.type) {
                case 'push':
                  result = await this.sendPushNotification(user, notificationContent);
                  break;
                case 'email':
                  result = await this.sendEmailNotification(user, notificationContent);
                  break;
                case 'in_app':
                  result = await this.sendInAppNotification(user, notificationContent);
                  break;
                default:
                  continue;
              }
              
              results.push(result);
            } catch (error) {
              logger.error(`Failed to send inventory alert via ${channel.type}:`, error);
              results.push({
                success: false,
                error: (error as Error).message,
                channel: channel.type
              });
            }
          }
        }
      }

      logger.info('Inventory alert notifications sent', {
        productId,
        productName,
        currentStock,
        threshold,
        recipientCount: adminUsers.length,
        notificationCount: results.length
      });

      return results;
    } catch (error) {
      logger.error('Failed to send inventory alert notifications:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences (with defaults)
   */
  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // In a real implementation, this would fetch from a UserPreferences collection
    // For now, return default preferences
    return {
      userId,
      channels: [
        { type: 'push', enabled: true },
        { type: 'email', enabled: true },
        { type: 'in_app', enabled: true },
        { type: 'sms', enabled: false }
      ],
      orderUpdates: true,
      promotions: true,
      inventoryAlerts: true,
      quietHours: {
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      }
    };
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // In a real implementation, this would update the UserPreferences collection
    // For now, just return the updated preferences
    const currentPreferences = await this.getUserNotificationPreferences(userId);
    
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      userId // Ensure userId is not overwritten
    };

    logger.info('Notification preferences updated', {
      userId,
      preferences: updatedPreferences
    });

    return updatedPreferences;
  }

  // Private helper methods

  private static generateOrderStatusContent(
    order: IOrder,
    previousStatus: OrderStatus,
    updatedBy?: string
  ): OrderNotificationData {
    let title: string;
    let message: string;
    let type: NotificationType;
    let priority: NotificationPriority = NotificationPriority.NORMAL;

    switch (order.status) {
      case 'confirmed':
        title = 'Order Confirmed';
        message = `Your order #${order.orderNumber} has been confirmed and is being prepared for shipment.`;
        type = NotificationType.ORDER_STATUS_UPDATE;
        break;
      
      case 'processing':
        title = 'Order Processing';
        message = `Your order #${order.orderNumber} is being processed and will ship soon.`;
        type = NotificationType.ORDER_STATUS_UPDATE;
        break;
      
      case 'shipped':
        title = 'Order Shipped';
        message = `Great news! Your order #${order.orderNumber} has been shipped${order.tracking.trackingNumber ? ` with tracking number ${order.tracking.trackingNumber}` : ''}.`;
        type = NotificationType.ORDER_SHIPPED;
        priority = NotificationPriority.HIGH;
        break;
      
      case 'delivered':
        title = 'Order Delivered';
        message = `Your order #${order.orderNumber} has been delivered. Thank you for your business!`;
        type = NotificationType.ORDER_DELIVERED;
        priority = NotificationPriority.HIGH;
        break;
      
      case 'cancelled':
        title = 'Order Cancelled';
        message = `Your order #${order.orderNumber} has been cancelled. If you have any questions, please contact support.`;
        type = NotificationType.ORDER_CANCELLED;
        priority = NotificationPriority.HIGH;
        break;
      
      default:
        title = 'Order Update';
        message = `Your order #${order.orderNumber} status has been updated to ${order.status}.`;
        type = NotificationType.ORDER_STATUS_UPDATE;
    }

    return {
      userId: order.userId.toString(),
      title,
      message,
      type,
      priority,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      data: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        previousStatus,
        updatedBy,
        trackingNumber: order.tracking.trackingNumber,
        estimatedDelivery: order.tracking.estimatedDelivery
      }
    };
  }

  private static async sendPushNotification(
    user: any,
    notification: NotificationData
  ): Promise<NotificationResult> {
    try {
      // In a real implementation, this would use Firebase Cloud Messaging (FCM)
      // or Apple Push Notification Service (APNS)
      
      // Mock implementation for demonstration
      const mockResult = {
        success: true,
        messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: 'push'
      };

      logger.info('Push notification sent (mock)', {
        userId: user._id,
        title: notification.title,
        messageId: mockResult.messageId
      });

      return mockResult;
    } catch (error) {
      logger.error('Push notification failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        channel: 'push'
      };
    }
  }

  private static async sendEmailNotification(
    user: any,
    notification: NotificationData
  ): Promise<NotificationResult> {
    try {
      // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
      
      // Mock implementation for demonstration
      const mockResult = {
        success: true,
        messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: 'email'
      };

      logger.info('Email notification sent (mock)', {
        userId: user._id,
        email: user.email,
        title: notification.title,
        messageId: mockResult.messageId
      });

      return mockResult;
    } catch (error) {
      logger.error('Email notification failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        channel: 'email'
      };
    }
  }

  private static async sendSMSNotification(
    user: any,
    notification: NotificationData
  ): Promise<NotificationResult> {
    try {
      // In a real implementation, this would use a service like Twilio, AWS SNS, etc.
      
      if (!user.phone) {
        throw new Error('User phone number not available');
      }

      // Mock implementation for demonstration
      const mockResult = {
        success: true,
        messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: 'sms'
      };

      logger.info('SMS notification sent (mock)', {
        userId: user._id,
        phone: user.phone,
        title: notification.title,
        messageId: mockResult.messageId
      });

      return mockResult;
    } catch (error) {
      logger.error('SMS notification failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        channel: 'sms'
      };
    }
  }

  private static async sendInAppNotification(
    user: any,
    notification: NotificationData
  ): Promise<NotificationResult> {
    try {
      // In a real implementation, this would store the notification in a database
      // and use WebSocket or Server-Sent Events to push to connected clients
      
      // Mock implementation for demonstration
      const mockResult = {
        success: true,
        messageId: `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: 'in_app'
      };

      logger.info('In-app notification sent (mock)', {
        userId: user._id,
        title: notification.title,
        messageId: mockResult.messageId
      });

      return mockResult;
    } catch (error) {
      logger.error('In-app notification failed:', error);
      return {
        success: false,
        error: (error as Error).message,
        channel: 'in_app'
      };
    }
  }

  private static async storeNotificationHistory(
    history: Omit<NotificationHistory, 'id'>
  ): Promise<void> {
    try {
      // In a real implementation, this would store in a NotificationHistory collection
      // For now, just log the history
      logger.info('Notification history stored', {
        userId: history.userId,
        type: history.type,
        title: history.title,
        channels: history.channels,
        sentAt: history.sentAt,
        results: history.results.map(r => ({ channel: r.channel, success: r.success }))
      });
    } catch (error) {
      logger.error('Failed to store notification history:', error);
      // Don't throw - notification history storage failure shouldn't break the main flow
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private static isWithinQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: preferences.quietHours.timezone 
    });

    const { start, end } = preferences.quietHours;
    
    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  /**
   * Get notification history for a user
   */
  static async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationHistory[]> {
    // In a real implementation, this would query the NotificationHistory collection
    // For now, return empty array
    logger.info('Fetching notification history (mock)', { userId, limit, offset });
    return [];
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would update the NotificationHistory collection
      logger.info('Notification marked as read (mock)', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }
}