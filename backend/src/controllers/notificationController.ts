import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ── GET ALL NOTIFICATIONS ──────────────────────────────
// GET /api/notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user!.userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.status(200).json({
      message: 'Notifications fetched successfully',
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};

// ── GET UNREAD COUNT ───────────────────────────────────
// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.count({
      where: { userId: req.user!.userId, isRead: false }
    });
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};

// ── MARK ONE AS READ ───────────────────────────────────
// PATCH /api/notifications/:id/read
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user!.userId }
    });

    if (!notification) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'Notification not found' });
      return;
    }

    await notification.update({ isRead: true });
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};

// ── MARK ALL AS READ ───────────────────────────────────
// PATCH /api/notifications/read-all
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user!.userId, isRead: false } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};

// ── DELETE ONE NOTIFICATION ────────────────────────────
// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user!.userId }
    });

    if (!notification) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'Notification not found' });
      return;
    }

    await notification.destroy();
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};
