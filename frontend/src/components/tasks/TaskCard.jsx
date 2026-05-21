import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const priorityColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const priorityBg    = { High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' };
const statusColor   = { 'To Do': '#6b7280', 'In Progress': '#3b9eed', Completed: '#10b981' };
const statusBg      = { 'To Do': '#f3f4f6', 'In Progress': '#eff6ff', Completed: '#f0fdf4' };

// Deterministic gradient pairs from task title
const BANNER_PALETTES = [
  { from: '#6366f1', to: '#818cf8', light: '#eef2ff', pattern: 'radial' },   // indigo
  { from: '#8b5cf6', to: '#c084fc', light: '#faf5ff', pattern: 'diagonal' }, // violet
  { from: '#ec4899', to: '#f472b6', light: '#fdf2f8', pattern: 'mesh' },     // pink
  { from: '#14b8a6', to: '#2dd4bf', light: '#f0fdfa', pattern: 'radial' },   // teal
  { from: '#f59e0b', to: '#fbbf24', light: '#fffbeb', pattern: 'diagonal' }, // amber
  { from: '#3b82f6', to: '#60a5fa', light: '#eff6ff', pattern: 'mesh' },     // blue
  { from: '#10b981', to: '#34d399', light: '#f0fdf4', pattern: 'radial' },   // emerald
  { from: '#f97316', to: '#fb923c', light: '#fff7ed', pattern: 'diagonal' }, // orange
];

const getBannerPalette = (title = '') => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return BANNER_PALETTES[Math.abs(hash) % BANNER_PALETTES.length];
};

const getAssigneeColor = (name = '') => {
  const palette = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f59e0b', '#3b82f6', '#10b981', '#f97316',
    '#ef4444', '#06b6d4',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getDueDateStyle = (value) => {
  if (!value) return {};
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return {};
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { color: '#ef4444', fontWeight: '600' };
  if (diff <= 3) return { color: '#f59e0b', fontWeight: '600' };
  return { color: '#6b7280' };
};

// Decorative SVG pattern for banner background
const BannerPattern = ({ pattern, color }) => {
  if (pattern === 'radial') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rg" cx="70%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#rg)"/>
      <circle cx="80%" cy="20%" r="60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <circle cx="80%" cy="20%" r="90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <circle cx="15%" cy="85%" r="40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
    </svg>
  );
  if (pattern === 'diagonal') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }} xmlns="http://www.w3.org/2000/svg">
      {[...Array(8)].map((_, i) => (
        <line key={i} x1={i * 30 - 20} y1="0" x2={i * 30 + 80} y2="160" stroke="white" strokeWidth="1.5"/>
      ))}
      <rect x="10%" y="10%" width="30%" height="30%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" rx="4"/>
    </svg>
  );
  // mesh
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.13 }} xmlns="http://www.w3.org/2000/svg">
      {[...Array(5)].map((_, r) =>
        [...Array(8)].map((_, c) => (
          <rect key={`${r}-${c}`} x={c * 30 - 5} y={r * 30 - 5} width="20" height="20" rx="4"
            fill="rgba(255,255,255,0.5)" transform={`rotate(15, ${c*30+5}, ${r*30+5})`}/>
        ))
      )}
    </svg>
  );
};

export default function TaskCard({ task, onDelete }) {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const isAdmin   = user?.role === 'Admin';
  const isPM      = user?.role === 'ProjectManager';
  const canDelete = isAdmin || isPM;
  const canEdit   = isAdmin || isPM;

  const palette   = getBannerPalette(task.title);
  const assignees = task.assignees || [];
  const MAX_SHOWN = 4;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(task);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/tasks/edit/${task.id}`);
  };

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Banner Image Area (styled like course card) ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          height: '160px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px 16px 16px',
        }}
      >
        {/* Decorative SVG pattern */}
        <BannerPattern pattern={palette.pattern} />

        {/* Top row: Priority badge + assignees */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {/* Priority badge */}
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {task.priority}
          </span>

          {/* Assignee avatars */}
          {assignees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {assignees.slice(0, MAX_SHOWN).map((a, i) => (
                <div
                  key={a.id}
                  title={a.name}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: getAssigneeColor(a.name),
                    border: '2.5px solid rgba(255,255,255,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#fff',
                    marginLeft: i === 0 ? 0 : '-7px',
                    zIndex: assignees.length - i,
                    position: 'relative',
                    flexShrink: 0,
                    textTransform: 'uppercase',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  {a.name?.charAt(0) || '?'}
                </div>
              ))}
              {assignees.length > MAX_SHOWN && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.28)',
                  backdropFilter: 'blur(4px)',
                  border: '2.5px solid rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#fff',
                  marginLeft: '-7px',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  +{assignees.length - MAX_SHOWN}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Task title */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '800',
            color: '#fff',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 2px 8px rgba(0,0,0,0.18)',
            letterSpacing: '-0.2px',
          }}>
            {task.title}
          </h3>
        </div>
      </div>

      {/* ── Card Body (white background, all existing details) ── */}
      <div style={{
        padding: '14px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flex: 1,
        backgroundColor: '#ffffff',
      }}>

        {/* Status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: '600',
            color: statusColor[task.status] || '#6b7280',
            backgroundColor: statusBg[task.status] || '#f3f4f6',
            padding: '3px 9px',
            borderRadius: '20px',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor[task.status] || '#6b7280',
              flexShrink: 0,
            }} />
            {task.status}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {task.description}
          </p>
        )}

        {/* Due date + Creator row + Action buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '10px',
          borderTop: '1px solid #f3f4f6',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {task.dueDate && (
              <span style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                ...getDueDateStyle(task.dueDate),
              }}>
                📅 {formatDate(task.dueDate)}
              </span>
            )}
            {task.creator?.name && (
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                by {task.creator.name}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            {canEdit && (
              <button
                onClick={handleEdit}
                title="Edit task"
                style={{
                  background: 'none',
                  border: `1px solid ${palette.from}40`,
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: palette.from,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${palette.from}10`;
                  e.currentTarget.style.borderColor = palette.from;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.borderColor = `${palette.from}40`;
                }}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                title="Delete task"
                style={{
                  background: 'none',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}