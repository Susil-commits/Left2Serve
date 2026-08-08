import { NotificationService } from '../services/NotificationService.js';
export class NotificationController {
    static async getNotifications(req, res, next) {
        try {
            const notifications = await NotificationService.getNotifications(req.user.id);
            res.json(notifications);
        }
        catch (err) {
            next(err);
        }
    }
    static async getUnreadCount(req, res, next) {
        try {
            const count = await NotificationService.getUnreadCount(req.user.id);
            res.json(count);
        }
        catch (err) {
            next(err);
        }
    }
    static async markAllAsRead(req, res, next) {
        try {
            await NotificationService.markAllAsRead(req.user.id);
            res.json({ message: 'All notifications marked as read' });
        }
        catch (err) {
            next(err);
        }
    }
    static async markAsRead(req, res, next) {
        try {
            await NotificationService.markAsRead(req.params.id, req.user.id);
            res.json({ message: 'Notification marked as read' });
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async deleteNotification(req, res, next) {
        try {
            await NotificationService.deleteNotification(req.params.id, req.user.id);
            res.json({ message: 'Notification deleted' });
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
}
