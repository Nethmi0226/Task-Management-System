import { useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const INTRO_DURATION_MS = 2200;
const TYPING_DURATION = '1.6s';
const TYPING_STEPS = 24;
const FADE_DELAY = '1.8s';
const CURSOR_BLINK_SPEED = '0.6s';
const TITLE_TEXT = 'Task Management System';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(isDark, light, dark) { return isDark ? dark : light; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function IntroKeyframes({ isDark }) {
  const cursorColor = t(isDark, '#0078d4', '#ffffff');
  return (
    <style>{`
      @keyframes typing {
        from { width: 0 }
        to   { width: ${TYPING_STEPS}ch }
      }
      @keyframes blink {
        from, to { border-color: transparent }
        50%      { border-color: ${cursorColor} }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px) }
        to   { opacity: 1; transform: translateY(0) }
      }
    `}</style>
  );
}

function LogoMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" fill="#6EE7B7" />
        <rect x="20" y="4" width="12" height="12" rx="2" fill="#34D399" opacity="0.7" />
        <rect x="4" y="20" width="12" height="12" rx="2" fill="#34D399" opacity="0.7" />
        <rect x="20" y="20" width="12" height="12" rx="2" fill="#6EE7B7" />
      </svg>
    </div>
  );
}

function TypingTitle({ isDark }) {
  return (
    <h1 style={{
      fontSize: '28px', fontWeight: '700',
      color: t(isDark, '#1a1a2e', '#ffffff'),
      whiteSpace: 'nowrap', overflow: 'hidden',
      borderRight: '3px solid',
      width: 0,
      animation: `typing ${TYPING_DURATION} steps(${TYPING_STEPS}) forwards, blink ${CURSOR_BLINK_SPEED} infinite`,
      margin: '0 auto',
    }}>
      {TITLE_TEXT}
    </h1>
  );
}

function SubLabel({ isDark }) {
  return (
    <p style={{
      fontSize: '13px',
      color: t(isDark, '#9ca3af', '#64748b'),
      marginTop: '12px',
      animation: `fadeIn 0.5s ease ${FADE_DELAY} both`,
    }}>
      Planora
    </p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntroPage({ onComplete }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(onComplete, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: t(isDark, '#f0f2f5', '#0f172a'),
      fontFamily: "'Inter', sans-serif",
      position: 'fixed', inset: 0, zIndex: 9999,
    }}>
      <IntroKeyframes isDark={isDark} />
      <div style={{ textAlign: 'center' }}>
        <LogoMark />
        <TypingTitle isDark={isDark} />
        <SubLabel isDark={isDark} />
      </div>
    </div>
  );
}
