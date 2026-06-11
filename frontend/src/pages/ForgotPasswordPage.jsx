import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../api/axios.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.description || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const c = isDark;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: c ? '#0f172a' : '#f0f2f5', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <button onClick={toggleTheme} style={{ position: 'fixed', top: '20px', right: '20px', background: c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {c ? '☀️' : '🌙'}
      </button>

      <div style={{ backgroundColor: c ? '#1e293b' : '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: c ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.1)', border: `1px solid ${c ? '#334155' : '#f1f5f9'}` }}>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: c ? '#f1f5f9' : '#1a1a2e', marginBottom: '12px' }}>Check your email</h2>
            <p style={{ fontSize: '13px', color: c ? '#64748b' : '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
              If your email is registered, you will receive a password reset link shortly. The link expires in 15 minutes.
            </p>
            <a href="/login" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#0078d4', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
              Back to Login
            </a>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: c ? '#f1f5f9' : '#1a1a2e', marginBottom: '6px' }}>Forgot Password?</h1>
              <p style={{ fontSize: '13px', color: c ? '#64748b' : '#9ca3af' }}>Enter your email and we will send a reset link</p>
            </div>

            {error && <div style={{ backgroundColor: c ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: `1px solid ${c ? 'rgba(239,68,68,0.3)' : '#fecaca'}`, color: c ? '#f87171' : '#dc2626', borderRadius: '10px', padding: '12px', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: c ? '#cbd5e1' : '#374151' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  style={{ padding: '11px 14px', borderRadius: '10px', border: `1px solid ${c ? '#334155' : '#e5e7eb'}`, backgroundColor: c ? '#0f172a' : '#f9fafb', color: c ? '#f1f5f9' : '#1a1a2e', fontSize: '14px', outline: 'none', boxSizing: 'border-box', width: '100%' }} />
              </div>

              <button type="submit" disabled={loading} style={{ padding: '13px', backgroundColor: loading ? '#6ea8da' : '#0078d4', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? <LoadingSpinner size={20} /> : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: c ? '#475569' : '#9ca3af' }}>
              Remember your password?{' '}
              <a href="/login" style={{ color: c ? '#60a5fa' : '#0078d4', fontWeight: '500' }}>Sign in</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}