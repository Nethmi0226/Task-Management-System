import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification';

// Store online users - key is userId, value is socket id
const onlineUsers = new Map<number, string>();

interface DecodedToken {
  userId: number;
  role: string;
}

interface NotificationData {
  title: string;
  message: string;
  type: string;
  taskId?: number | null;
}

export const initializeSocket = (io: Server): void => {

  // Middleware to verify JWT when socket connects
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).user.userId as number;
    console.log(`User ${userId} connected via WebSocket`);

    // Register this user as online
    onlineUsers.set(userId, socket.id);

    // Deliver any unread notifications stored while user was offline
    try {
      const unreadNotifications = await Notification.findAll({
        where: { userId, isRead: false },
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      if (unreadNotifications.length > 0) {
        socket.emit('unread_notifications', unreadNotifications);
      }
    } catch (error) {
      console.error('Error delivering offline notifications:', error);
    }

    // Mark one notification as read when user confirms receipt
    socket.on('mark_read', async (notificationId: number) => {
      try {
        await Notification.update(
          { isRead: true },
          { where: { id: notificationId, userId } }
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // Mark all notifications as read
    socket.on('mark_all_read', async () => {
      try {
        await Notification.update(
          { isRead: true },
          { where: { userId, isRead: false } }
        );
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    });

    // Remove user from online list when disconnected
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    });
  });
};

// Send notification to a specific user
// If user is online deliver instantly via socket
// If user is offline save to database for later delivery
export const sendNotification = async (
  io: Server,
  userId: number,
  notificationData: NotificationData
): Promise<void> => {
  try {
    // Always save notification to database first
    const notification = await Notification.create({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type as any,
      taskId: notificationData.taskId || null,
      isRead: false
    });

    // If user is currently online send it immediately
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('new_notification', notification);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Send notification to multiple users at once
export const sendNotificationToMany = async (
  io: Server,
  userIds: number[],
  notificationData: NotificationData
): Promise<void> => {
  for (const userId of userIds) {
    await sendNotification(io, userId, notificationData);
  }
};
