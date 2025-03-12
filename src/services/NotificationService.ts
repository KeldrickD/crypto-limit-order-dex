import { NotificationChannel, NotificationEvent } from '@/context/UserSettingsContext';

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationEvent;
  orderId: number;
  timestamp: Date;
  data?: Record<string, unknown>;
}

class NotificationService {
  private static instance: NotificationService;
  private pushSupported: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializePushNotifications();
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializePushNotifications(): Promise<void> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        this.pushSupported = permission === 'granted';
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      this.pushSupported = false;
    }
  }

  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    if (!this.pushSupported) return;

    try {
      const notification = new Notification(payload.title, {
        body: payload.message,
        icon: '/notification-icon.png',
        tag: `order-${payload.orderId}`,
        data: payload.data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private async sendEmailNotification(
    email: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API
      // to send the email using a service like SendGrid or AWS SES
      console.log('Sending email notification to:', email, payload);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  public async notify(
    channel: NotificationChannel,
    email: string | undefined,
    payload: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case 'push':
        await this.sendPushNotification(payload);
        break;
      case 'email':
        if (email) {
          await this.sendEmailNotification(email, payload);
        }
        break;
      case 'none':
        break;
      default:
        console.warn('Unknown notification channel:', channel);
    }
  }

  public async notifyOrderStatus(
    channel: NotificationChannel,
    email: string | undefined,
    orderId: number,
    status: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Order Status Update',
      message: `Order #${orderId} has been ${status.toLowerCase()}`,
      type: status.toLowerCase() as NotificationEvent,
      orderId,
      timestamp: new Date(),
      data: additionalData
    };

    await this.notify(channel, email, payload);
  }

  public async notifyPriceAlert(
    channel: NotificationChannel,
    email: string | undefined,
    tokenPair: string,
    price: number,
    threshold: number
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Price Alert',
      message: `${tokenPair} has reached ${price} (threshold: ${threshold})`,
      type: 'priceAlert',
      orderId: 0, // Not applicable for price alerts
      timestamp: new Date(),
      data: { tokenPair, price, threshold }
    };

    await this.notify(channel, email, payload);
  }
}

export const notificationService = NotificationService.getInstance(); 