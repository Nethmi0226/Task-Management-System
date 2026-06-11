import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <p style={{ fontSize: '72px', lineHeight: 1 }}>🔍</p>
      <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>404 — Page Not Found</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>The page you are looking for does not exist.</p>
      <button onClick={() => navigate('/home')} style={{ padding: '10px 24px', backgroundColor: '#0078d4', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
        Go to Dashboard
      </button>
    </div>
  );
}