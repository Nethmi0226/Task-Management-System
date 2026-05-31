import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import Avatar from '../components/common/Avatar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ icon, label, value, color, onClick }) => (
  <div onClick={onClick} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', alignItems: 'center', gap: '16px' }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</p>
    </div>
  </div>
);

export default function HomePage() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes] = await Promise.all([
          api.get('/tasks')
        ]);
        const allTasks = tasksRes.data.tasks || [];
        setTasks(allTasks.slice(0, 5));
        setStats({
          total: allTasks.length,
          todo: allTasks.filter(t => t.status === 'To Do').length,
          inProgress: allTasks.filter(t => t.status === 'In Progress').length,
          completed: allTasks.filter(t => t.status === 'Completed').length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const priorityColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
  const statusColor = { 'To Do': '#6b7280', 'In Progress': '#3b9eed', 'Completed': '#10b981' };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Welcome banner */}
        <div style={{ background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)', borderRadius: '16px', padding: '28px 32px', marginBottom: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p style={{ fontSize: '14px', opacity: 0.85 }}>Here is what is happening in your workspace today.</p>
          </div>
          <Avatar name={user?.name || ''} size={56} />
        </div>

        {/* Stats grid */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <StatCard icon="📋" label="Total Tasks" value={stats.total} color="#0078d4" onClick={() => navigate('/tasks')} />
            <StatCard icon="⏳" label="To Do" value={stats.todo} color="#6b7280" onClick={() => navigate('/tasks?status=To Do')} />
            <StatCard icon="🔄" label="In Progress" value={stats.inProgress} color="#3b9eed" onClick={() => navigate('/tasks?status=In Progress')} />
            <StatCard icon="✅" label="Completed" value={stats.completed} color="#10b981" onClick={() => navigate('/tasks?status=Completed')} />
          </div>
        )}

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* Recent Tasks */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Recent Tasks</h2>
              <button onClick={() => navigate('/tasks')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>View all →</button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>📭</p>
                <p style={{ fontSize: '13px' }}>No tasks yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map(task => (
                  <div key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}
                    style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.3', flex: 1 }}>{task.title}</p>
                      <span style={{ fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', backgroundColor: `${priorityColor[task.priority]}18`, color: priorityColor[task.priority], flexShrink: 0 }}>
                        {task.priority}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: `${statusColor[task.status]}18`, color: statusColor[task.status] }}>
                        {task.status}
                      </span>
                      {task.dueDate && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

      {/* Recent Notifications */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: '8px', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '20px', fontSize: '10px', padding: '2px 7px', fontWeight: '700' }}>
                {unreadCount}
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  try {
                    await api.patch('/notifications/read-all');
                    markAllAsRead();
                  } catch (e) { console.error(e); }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>
                Mark all read
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</p>
            <p style={{ fontSize: '13px' }}>No notifications</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: n.isRead ? 'transparent' : 'var(--accent-light)' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 4px' }}>{n.message}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
    </Layout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}