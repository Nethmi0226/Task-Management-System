import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import api from '../api/axios';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  // Connect socket when user is logged in
  useEffect(() => {
    if (!token || !user) return;

    const fetchInitialNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const notifs = res.data.notifications || res.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      } catch (e) {
        console.error('Fetch initial notifications error:', e);
      }
    };

    fetchInitialNotifications();

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    // Receive unread notifications on reconnect
    newSocket.on('unread_notifications', (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    });

    // Receive new real-time notification
    newSocket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast popup
      toast(notif.message, {
        icon: getNotifIcon(notif.type),
        duration: 4000,
        style: { fontSize: '13px', maxWidth: '320px' }
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const getNotifIcon = (type) => {
    const icons = {
      task_assigned: '📋',
      status_changed: '🔄',
      comment_added: '💬',
      deadline_approaching: '⏰',
      general: '🔔'
    };
    return icons[type] || '🔔';
  };

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    socket?.emit('mark_read', id);
  }, [socket]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    socket?.emit('mark_all_read');
  }, [socket]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, markAsRead, markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);