import { useNotifications } from '../../context/NotificationContext';
import { useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api/axios';

const typeIcon = {
  task_assigned: '📋',
  status_changed: '🔄',
  comment_added: '💬',
  deadline_approaching: '⏰',
  general: '🔔'
};

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllAsRead();
    } catch (e) { console.error(e); }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      markAsRead(id);
    } catch (e) { console.error(e); }
  };

  return (
    <div ref={ref} style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Notifications</span>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={styles.markAllBtn}>
            Mark all read
          </button>
        )}
      </div>

      <div style={styles.list}>
        {notifications.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: '32px' }}>🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 20).map(notif => (
            <div key={notif.id}
              onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              style={{
                ...styles.item,
                backgroundColor: notif.isRead ? 'transparent' : 'var(--accent-light)',
                cursor: notif.isRead ? 'default' : 'pointer'
              }}>
              <span style={styles.icon}>{typeIcon[notif.type] || '🔔'}</span>
              <div style={styles.content}>
                <p style={styles.notifTitle}>{notif.title}</p>
                <p style={styles.notifMsg}>{notif.message}</p>
                <p style={styles.notifTime}>
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!notif.isRead && <div style={styles.dot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute', top: '48px', right: 0,
    width: '360px', backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)', zIndex: 1000,
    overflow: 'hidden',
    '@media (max-width: 480px)': { width: '100vw', right: '-16px' }
  },
  header: {
    padding: '16px 20px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)'
  },
  title: { fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' },
  markAllBtn: {
    background: 'none', border: 'none',
    color: 'var(--accent)', fontSize: '12px',
    fontWeight: '500', cursor: 'pointer', padding: '4px 8px',
    borderRadius: 'var(--radius-sm)'
  },
  list: { maxHeight: '420px', overflowY: 'auto' },
  empty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', gap: '8px',
    color: 'var(--text-muted)', fontSize: '13px'
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '14px 20px', transition: 'background-color 0.15s',
    borderBottom: '1px solid var(--border)',
    position: 'relative'
  },
  icon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  content: { flex: 1, minWidth: 0 },
  notifTitle: { fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' },
  notifMsg: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.4' },
  notifTime: { fontSize: '11px', color: 'var(--text-muted)' },
  dot: {
    width: '8px', height: '8px', borderRadius: '50%',
    backgroundColor: 'var(--accent)', flexShrink: 0, marginTop: '6px'
  }
};