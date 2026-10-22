import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/NotificationService.js';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await NotificationService.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (err) { next(err); }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await NotificationService.getUnreadCount(req.user!.id);
      res.json(count);
    } catch (err) { next(err); }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (err) { next(err); }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAsRead(req.params.id as string, req.user!.id);
      res.json({ message: 'Notification marked as read' });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.deleteNotification(req.params.id as string, req.user!.id);
      res.json({ message: 'Notification deleted' });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }
}
