import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Layout from '../components/layout/Layout.jsx';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = theme === 'dark';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const rules = [
    { label: 'At least 8 characters', test: v => v.length >= 8 },
    { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'One lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'One number', test: v => /\d/.test(v) },
    { label: 'One special character (@$!%*?&)', test: v => /[@$!%*?&]/.test(v) },
  ];

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
      await api.post('/auth/change-password', { newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/home'), 2000);
    } catch (err) {
      setError(err.response?.data?.description || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inner = (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {user?.mustChangePassword ? '🔒 Set New Password' : '🔒 Change Password'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user?.mustChangePassword ? 'You must set a new password before continuing.' : 'Update your account password.'}
          </p>
        </div>

        {success && (
          <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '10px', padding: '12px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
            ✅ Password changed successfully. Redirecting...
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.3)', color: isDark ? '#f87171' : '#dc2626', borderRadius: '10px', padding: '12px', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Enter new password"
                style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Password strength rules */}
            {form.newPassword && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: r.test(form.newPassword) ? '#10b981' : 'var(--text-muted)' }}>
                    <span>{r.test(form.newPassword) ? '✅' : '⭕'}</span>
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Confirm Password</label>
            <input type="password" value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              placeholder="Confirm new password"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${form.confirm && form.confirm !== form.newPassword ? '#ef4444' : 'var(--border)'}`, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            {form.confirm && form.confirm !== form.newPassword && (
              <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={loading || success}
            style={{ padding: '13px', backgroundColor: '#0078d4', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
            {loading ? <LoadingSpinner size={20} /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );

  // If mustChangePassword show without layout
  if (user?.mustChangePassword) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {inner}
      </div>
    );
  }

  return <Layout>{inner}</Layout>;
}