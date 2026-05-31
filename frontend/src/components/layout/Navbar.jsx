import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import NotificationPanel from '../common/NotificationPanel';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout }          = useAuth();
  const { theme, toggleTheme }    = useTheme();
  const { unreadCount }           = useNotifications();
  const navigate                  = useNavigate();
  const [showNotif, setShowNotif]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleColors = {
    Admin:          '#6366f1',
    ProjectManager: '#3b9eed',
    Collaborator:   '#10b981',
  };
  const roleLabels = {
    Admin:          'Admin',
    ProjectManager: 'Project Manager',
    Collaborator:   'Collaborator',
  };

  const accent = roleColors[user?.role] || '#6366f1';
  const isDark  = theme === 'dark';

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--navbar-height)',
      backgroundColor: 'var(--bg-navbar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px 0 12px',
      zIndex: 100,
      boxShadow: isDark
        ? '0 1px 0 rgba(255,255,255,0.04)'
        : '0 1px 0 rgba(0,0,0,0.06)',
      transition: 'background-color 0.2s ease',
      gap: '12px',
    }}>

      {/* ── LEFT: hamburger + logo ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink: 0 }}>
        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Logo — clickable, navigates to Dashboard */}
        <button
          onClick={() => navigate('/home')}
          title="Go to Dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px', borderRadius: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
            <rect x="4"  y="4"  width="12" height="12" rx="3" fill="#6EE7B7"/>
            <rect x="20" y="4"  width="12" height="12" rx="3" fill="#34D399" opacity="0.75"/>
            <rect x="4"  y="20" width="12" height="12" rx="3" fill="#34D399" opacity="0.75"/>
            <rect x="20" y="20" width="12" height="12" rx="3" fill="#6EE7B7"/>
          </svg>
          <span style={{
            fontWeight: '800', fontSize: '17px',
            color: 'var(--text-primary)', letterSpacing: '-0.6px',
          }}>
            TMS
          </span>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── RIGHT: theme toggle + notifications + profile ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'2px', flexShrink: 0 }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '8px',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {theme === 'light' ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"     x2="12" y2="3"/>
              <line x1="12" y1="21"    x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12"    x2="3" y2="12"/>
              <line x1="21" y1="12"   x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

        {/* Separator */}
        <div style={{ width:'1px', height:'22px', backgroundColor:'var(--border)', margin:'0 4px' }}/>

        {/* Notifications */}
        <div style={{ position:'relative' }} ref={notifRef}>
          <button
            onClick={() => { setShowNotif(p => !p); setShowProfile(false); }}
            aria-label="Notifications"
            style={{
              position: 'relative',
              background: showNotif ? 'var(--bg-primary)' : 'none',
              border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '8px',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => {
              if (!showNotif) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '5px', right: '5px',
                backgroundColor: '#ef4444', color: '#fff',
                borderRadius: '10px', fontSize: '9px', fontWeight: '700',
                minWidth: '15px', height: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
                boxShadow: '0 0 0 2px var(--bg-navbar)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
        </div>

        {/* Separator */}
        <div style={{ width:'1px', height:'22px', backgroundColor:'var(--border)', margin:'0 4px' }}/>

        {/* Profile dropdown */}
        <div style={{ position:'relative' }} ref={profileRef}>
          <button
            onClick={() => { setShowProfile(p => !p); setShowNotif(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              background: showProfile ? 'var(--bg-primary)' : 'none',
              border: '1px solid transparent',
              ...(showProfile ? { borderColor: 'var(--border)' } : {}),
              padding: '5px 10px 5px 6px',
              borderRadius: '10px', cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              if (!showProfile) { e.currentTarget.style.background = 'var(--bg-primary)'; }
            }}
            onMouseLeave={e => {
              if (!showProfile) { e.currentTarget.style.background = 'none'; }
            }}
          >
            {/* Avatar with online ring */}
            <div style={{ position:'relative', flexShrink: 0 }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '800', color: '#fff',
                textTransform: 'uppercase',
                boxShadow: `0 0 0 2px var(--bg-navbar), 0 0 0 3.5px ${accent}60`,
              }}>
                {user?.name?.charAt(0) || '?'}
              </div>
              {/* Online dot */}
              <span style={{
                position: 'absolute', bottom: '0', right: '0',
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '1.5px solid var(--bg-navbar)',
              }}/>
            </div>

            {/* Name + role */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                {user?.name}
              </span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: accent, lineHeight: '1.3' }}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>

            {/* Chevron */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ color: 'var(--text-muted)', transform: showProfile ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {showProfile && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: isDark
                ? '0 16px 48px rgba(0,0,0,0.5)'
                : '0 16px 48px rgba(0,0,0,0.12)',
              minWidth: '230px', zIndex: 1000, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '16px', display:'flex', alignItems:'center', gap:'12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: '800', color: '#fff',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {user?.email}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '10px', fontWeight: '700',
                    color: accent, backgroundColor: `${accent}18`,
                    padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {roleLabels[user?.role] || user?.role}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => { navigate('/change-password'); setShowProfile(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', textAlign: 'left',
                    background: 'none', border: 'none',
                    padding: '10px 12px', borderRadius: '8px',
                    fontSize: '13px', color: 'var(--text-primary)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize:'15px' }}>🔒</span>
                  Change Password
                </button>

                <div style={{ height:'1px', backgroundColor:'var(--border)', margin:'4px 0' }}/>

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', textAlign: 'left',
                    background: 'none', border: 'none',
                    padding: '10px 12px', borderRadius: '8px',
                    fontSize: '13px', color: '#ef4444',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize:'15px' }}>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}