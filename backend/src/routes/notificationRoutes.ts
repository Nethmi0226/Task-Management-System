import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// GET /api/notifications — get all notifications for logged-in user
router.get('/', verifyToken, getNotifications);

// GET /api/notifications/unread-count — get count of unread notifications
router.get('/unread-count', verifyToken, getUnreadCount);

// PATCH /api/notifications/read-all — mark all as read
// Must be BEFORE /:id/read to avoid Express reading "read-all" as an ID
router.patch('/read-all', verifyToken, markAllAsRead);

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', verifyToken, markAsRead);

// DELETE /api/notifications/:id — delete one notification
router.delete('/:id', verifyToken, deleteNotification);

export default router;
