import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#0078d4';
const HOME_ROUTE = '/home';

// ─── Shared Styles ────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--bg-primary)',
  gap: '16px',
  fontFamily: "'Inter', sans-serif",
};

const headingStyle = {
  fontSize: '28px',
  fontWeight: '700',
  color: 'var(--text-primary)',
};

const subTextStyle = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
};

const btnStyle = {
  padding: '10px 24px',
  backgroundColor: ACCENT,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '8px',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={pageStyle}>
      <p style={{ fontSize: '72px', lineHeight: 1 }}>🔍</p>
      <h1 style={headingStyle}>404 — Page Not Found</h1>
      <p style={subTextStyle}>The page you are looking for does not exist.</p>
      <button onClick={() => navigate(HOME_ROUTE)} style={btnStyle}>
        Go to Dashboard
      </button>
    </div>
  );
}
