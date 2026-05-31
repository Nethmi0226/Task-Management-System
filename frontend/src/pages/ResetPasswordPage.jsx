import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../api/axios.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function ResetPasswordPage() {
  // Token comes from URL query string: /reset-password?token=abc123
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  const rules = [
    { label: 'At least 8 characters', test: v => v.length >= 8 },
    { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'One lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'One number', test: v => /\d/.test(v) },
    { label: 'One special character (@$!%*?&)', test: v => /[@$!%*?&]/.test(v) },
  ];

  // Verify token on page load
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }
    const verify = async () => {
      try {
        await api.get(`/auth/verify-reset-token/${token}`);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    const allPass = rules.every(r => r.test(form.newPassword));
    if (!allPass) {
      setError('Password does not meet all requirements.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: form.newPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.description || err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: isDark ? '#0f172a' : '#f0f2f5',
    fontFamily: "'Inter', sans-serif", padding: '20px', position: 'relative'
  };

  const cardStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px',
    boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.1)',
    position: 'relative', zIndex: 1,
    border: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
  };

  if (verifying) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <LoadingSpinner size={40} />
            <p style={{ marginTop: '16px', color: isDark ? '#64748b' : '#9ca3af', fontSize: '14px' }}>
              Verifying your reset link...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1a1a2e', marginBottom: '12px' }}>
              Invalid or Expired Link
            </h2>
            <p style={{ fontSize: '13px', color: isDark ? '#64748b' : '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
              This password reset link is invalid or has expired. Reset links are only valid for 15 minutes.
            </p>
            <a href="/forgot-password" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#0078d4', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
              Request New Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1a1a2e', marginBottom: '12px' }}>
              Password Reset Successfully
            </h2>
            <p style={{ fontSize: '13px', color: isDark ? '#64748b' : '#6b7280', marginBottom: '8px' }}>
              Redirecting you to login in 3 seconds...
            </p>
            <LoadingSpinner size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: isDark ? 'rgba(59,158,237,0.06)' : 'rgba(0,120,212,0.06)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', backgroundColor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.06)', filter: 'blur(60px)' }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
        {isDark ? '☀️' : '🌙'}
      </button>

      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1a1a2e', marginBottom: '6px' }}>Set New Password</h1>
          <p style={{ fontSize: '13px', color: isDark ? '#64748b' : '#9ca3af' }}>Choose a strong password for your account</p>
        </div>

        {error && (
          <div style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`, color: isDark ? '#f87171' : '#dc2626', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: isDark ? '#cbd5e1' : '#374151' }}>New Password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Enter new password"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, backgroundColor: isDark ? '#0f172a' : '#f9fafb', color: isDark ? '#f1f5f9' : '#1a1a2e', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            {form.newPassword && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {rules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: r.test(form.newPassword) ? '#10b981' : isDark ? '#64748b' : '#9ca3af' }}>
                    <span>{r.test(form.newPassword) ? '✅' : '⭕'}</span>
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: isDark ? '#cbd5e1' : '#374151' }}>Confirm Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              placeholder="Repeat new password"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${form.confirm && form.confirm !== form.newPassword ? '#ef4444' : isDark ? '#334155' : '#e5e7eb'}`, backgroundColor: isDark ? '#0f172a' : '#f9fafb', color: isDark ? '#f1f5f9' : '#1a1a2e', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            {form.confirm && form.confirm !== form.newPassword && (
              <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '13px', backgroundColor: loading ? '#6ea8da' : '#0078d4', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <LoadingSpinner size={20} /> : 'Reset Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: isDark ? '#475569' : '#9ca3af' }}>
          Remember it? <a href="/login" style={{ color: isDark ? '#60a5fa' : '#0078d4', fontWeight: '500' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}