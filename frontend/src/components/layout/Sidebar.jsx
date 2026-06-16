import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { to: '/home',  icon: '🏠', label: 'Dashboard', roles: ['Admin', 'ProjectManager', 'Collaborator'] },
  { to: '/tasks', icon: '📋', label: 'Tasks',     roles: ['Admin', 'ProjectManager', 'Collaborator'] },
  { to: '/users', icon: '👥', label: 'Users',     roles: ['Admin'] },
  { to: '/analytics', icon: '📊', label: 'Analytics', roles: ['Admin'] },
  { to: '/team',  icon: '👷', label: 'My Team',   roles: ['ProjectManager'] },
];

const roleColor = {
  Admin:          '#6366f1',
  ProjectManager: '#3b9eed',
  Collaborator:   '#10b981',
};

const roleLabel = {
  Admin:          'Admin',
  ProjectManager: 'Project Manager',
  Collaborator:   'Collaborator',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isDark   = theme === 'dark';
  const filtered = navItems.filter(item => item.roles.includes(user?.role));
  const accent   = roleColor[user?.role] || '#6366f1';

  const t = isDark ? {
    sidebar:      '#13152a',
    border:       'rgba(255,255,255,0.07)',
    navLabel:     'rgba(255,255,255,0.28)',
    navDefault:   'rgba(255,255,255,0.55)',
    navActive:    '#ffffff',
    navActiveBg:  `${accent}28`,
    navHoverBg:   'rgba(255,255,255,0.06)',
    navActiveBorder: accent,
    userCard:     'rgba(255,255,255,0.05)',
    userCardBorder:'rgba(255,255,255,0.08)',
    userName:     'rgba(255,255,255,0.9)',
    divider:      'rgba(255,255,255,0.07)',
  } : {
    sidebar:      '#ffffff',
    border:       'rgba(0,0,0,0.07)',
    navLabel:     'rgba(0,0,0,0.35)',
    navDefault:   '#4b5563',
    navActive:    accent,
    navActiveBg:  `${accent}14`,
    navHoverBg:   'rgba(0,0,0,0.04)',
    navActiveBorder: accent,
    userCard:     '#f8fafc',
    userCardBorder:'rgba(0,0,0,0.08)',
    userName:     '#111827',
    divider:      'rgba(0,0,0,0.07)',
  };

  return (
    <>
      {/* Mobile overlay — only on mobile when sidebar is open */}
      {isOpen && isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 98,
          }}
        />
      )}

      <aside style={{
        position: 'fixed',
        top: 'var(--navbar-height)',
        left: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        backgroundColor: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99,
        transition: 'transform 0.25s ease, background-color 0.2s ease',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>

        <nav style={{ flex: 1, padding: '20px 12px 12px' }}>
          <p style={{
            fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px',
            color: t.navLabel, padding: '0 10px', marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            Menu
          </p>

          {filtered.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={isMobile ? onClose : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '11px',
                padding: '10px 12px', borderRadius: '10px', marginBottom: '3px',
                fontSize: '13px', fontWeight: isActive ? '600' : '500',
                textDecoration: 'none',
                color: isActive ? t.navActive : t.navDefault,
                backgroundColor: isActive ? t.navActiveBg : 'transparent',
                borderLeft: isActive ? `3px solid ${t.navActiveBorder}` : '3px solid transparent',
                transition: 'all 0.15s ease',
              })}
              onMouseEnter={e => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) e.currentTarget.style.backgroundColor = t.navHoverBg;
              }}
              onMouseLeave={e => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '16px', width: '22px', textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ height: '1px', backgroundColor: t.divider, margin: '0 16px' }} />

        <div style={{ padding: '12px' }}>
          <div style={{
            backgroundColor: t.userCard, border: `1px solid ${t.userCardBorder}`,
            borderRadius: '12px', padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '11px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: '800',
              color: '#fff', flexShrink: 0, textTransform: 'uppercase',
              boxShadow: `0 0 0 3px ${accent}28`,
            }}>
              {user?.name?.charAt(0) || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '12px', fontWeight: '700', color: t.userName,
                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </p>
              <span style={{
                display: 'inline-block', fontSize: '10px', fontWeight: '600',
                color: accent, backgroundColor: `${accent}18`,
                padding: '1px 7px', borderRadius: '20px', marginTop: '3px',
              }}>
                {roleLabel[user?.role] || user?.role}
              </span>
            </div>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#10b981', flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
            }} />
          </div>
        </div>
      </aside>
    </>
  );
}
