import { useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';

export default function IntroPage({ onComplete }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#0f172a' : '#f0f2f5',
      fontFamily: "'Inter', sans-serif",
      position: 'fixed', inset: 0, zIndex: 9999
    }}>
      <style>{`
        @keyframes typing {
          from { width: 0 }
          to { width: 24ch }
        }
        @keyframes blink {
          from, to { border-color: transparent }
          50% { border-color: ${isDark ? '#ffffff' : '#0078d4'} }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="4" width="12" height="12" rx="2" fill="#6EE7B7" />
            <rect x="20" y="4" width="12" height="12" rx="2" fill="#34D399" opacity="0.7" />
            <rect x="4" y="20" width="12" height="12" rx="2" fill="#34D399" opacity="0.7" />
            <rect x="20" y="20" width="12" height="12" rx="2" fill="#6EE7B7" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '28px', fontWeight: '700',
          color: isDark ? '#ffffff' : '#1a1a2e',
          whiteSpace: 'nowrap', overflow: 'hidden',
          borderRight: '3px solid',
          width: 0,
          animation: 'typing 1.6s steps(24) forwards, blink 0.6s infinite',
          margin: '0 auto'
        }}>
          Task Management System
        </h1>
        <p style={{
          fontSize: '13px', color: isDark ? '#64748b' : '#9ca3af',
          marginTop: '12px',
          animation: 'fadeIn 0.5s ease 1.8s both'
        }}>
          TMS
        </p>
      </div>
    </div>
  );
}