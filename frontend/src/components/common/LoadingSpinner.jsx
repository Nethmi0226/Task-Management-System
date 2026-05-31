export default function LoadingSpinner({ size = 40, fullScreen = false }) {
  const spinner = (
    <div style={{
      width: size,
      height: size,
      border: `3px solid var(--border)`,
      borderTop: `3px solid var(--accent)`,
      borderRadius: '50%',
      animation: 'tms-spin 0.8s linear infinite',
      flexShrink: 0,
      background: 'transparent',
      boxSizing: 'border-box',
      display: 'inline-block'
    }}>
      <style>{`
        @keyframes tms-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        zIndex: 9999
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
      {spinner}
    </div>
  );
}