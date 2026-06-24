import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../api/axios.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT              = '#0078d4';
const REDIRECT_DELAY_MS   = 3000;

const PASSWORD_RULES = [
  { label: 'At least 8 characters',             test: v => v.length >= 8 },
  { label: 'One uppercase letter',               test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter',               test: v => /[a-z]/.test(v) },
  { label: 'One number',                         test: v => /\d/.test(v) },
  { label: 'One special character (@$!%*?&#)',   test: v => /[@$!%*?&#]/.test(v) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(isDark, light, dark) { return isDark ? dark : light; }

function allRulesPass(password) {
  return PASSWORD_RULES.every(r => r.test(password));
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

function containerStyles(isDark) {
  return {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: t(isDark, '#f0f2f5', '#0f172a'),
    fontFamily: "'Inter', sans-serif", padding: '20px', position: 'relative',
  };
}

function cardStyles(isDark) {
  return {
    backgroundColor: t(isDark, '#ffffff', '#1e293b'),
    borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px',
    boxShadow: t(isDark, '0 8px 40px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.5)'),
    position: 'relative', zIndex: 1,
    border: `1px solid ${t(isDark, '#f1f5f9', '#334155')}`,
  };
}

function inputStyles(isDark, borderOverride) {
  return {
    width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
    backgroundColor: t(isDark, '#f9fafb', '#0f172a'),
    color: t(isDark, '#1a1a2e', '#f1f5f9'),
    border: `1px solid ${borderOverride || t(isDark, '#e5e7eb', '#334155')}`,
  };
}

// ─── Shared / Reusable Sub-components ────────────────────────────────────────

function BackgroundBlobs({ isDark }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: t(isDark, 'rgba(0,120,212,0.06)', 'rgba(59,158,237,0.06)'), filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', backgroundColor: t(isDark, 'rgba(16,185,129,0.06)', 'rgba(16,185,129,0.05)'), filter: 'blur(60px)' }} />
    </div>
  );
}

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10, background: t(isDark, 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)'), border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function FieldLabel({ isDark, children }) {
  return (
    <label style={{ fontSize: '13px', fontWeight: '500', color: t(isDark, '#374151', '#cbd5e1') }}>
      {children}
    </label>
  );
}

function ErrorBanner({ isDark, message }) {
  if (!message) return null;
  return (
    <div style={{ backgroundColor: t(isDark, '#fef2f2', 'rgba(239,68,68,0.12)'), border: `1px solid ${t(isDark, '#fecaca', 'rgba(239,68,68,0.3)')}`, color: t(isDark, '#dc2626', '#f87171'), borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '20px' }}>
      ⚠️ {message}
    </div>
  );
}

// ─── State Screen Components ──────────────────────────────────────────────────

function VerifyingScreen({ isDark }) {
  return (
    <div style={containerStyles(isDark)}>
      <div style={cardStyles(isDark)}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <LoadingSpinner size={40} />
          <p style={{ marginTop: '16px', color: t(isDark, '#9ca3af', '#64748b'), fontSize: '14px' }}>
            Verifying your reset link...
          </p>
        </div>
      </div>
    </div>
  );
}

function InvalidTokenScreen({ isDark }) {
  return (
    <div style={containerStyles(isDark)}>
      <div style={cardStyles(isDark)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: t(isDark, '#1a1a2e', '#f1f5f9'), marginBottom: '12px' }}>
            Invalid or Expired Link
          </h2>
          <p style={{ fontSize: '13px', color: t(isDark, '#6b7280', '#64748b'), marginBottom: '24px', lineHeight: '1.6' }}>
            This password reset link is invalid or has expired. Reset links are only valid for 15 minutes.
          </p>
          <a href="/forgot-password" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: ACCENT, color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
            Request New Link
          </a>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ isDark }) {
  return (
    <div style={containerStyles(isDark)}>
      <div style={cardStyles(isDark)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: t(isDark, '#1a1a2e', '#f1f5f9'), marginBottom: '12px' }}>
            Password Reset Successfully
          </h2>
          <p style={{ fontSize: '13px', color: t(isDark, '#6b7280', '#64748b'), marginBottom: '8px' }}>
            Redirecting you to login in 3 seconds...
          </p>
          <LoadingSpinner size={24} />
        </div>
      </div>
    </div>
  );
}

// ─── Form Sub-components ──────────────────────────────────────────────────────

function PasswordRules({ isDark, password }) {
  if (!password) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
      {PASSWORD_RULES.map(r => {
        const passes = r.test(password);
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: passes ? '#10b981' : t(isDark, '#9ca3af', '#64748b') }}>
            <span>{passes ? '✅' : '⭕'}</span>
            {r.label}
          </div>
        );
      })}
    </div>
  );
}

function NewPasswordField({ isDark, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <FieldLabel isDark={isDark}>New Password</FieldLabel>
      <input
        type="password" value={value} onChange={onChange}
        placeholder="Enter new password"
        style={inputStyles(isDark)}
      />
      <PasswordRules isDark={isDark} password={value} />
    </div>
  );
}

function ConfirmPasswordField({ isDark, value, newPassword, onChange }) {
  const mismatch = value && value !== newPassword;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <FieldLabel isDark={isDark}>Confirm Password</FieldLabel>
      <input
        type="password" value={value} onChange={onChange}
        placeholder="Repeat new password"
        style={inputStyles(isDark, mismatch ? '#ef4444' : undefined)}
      />
      {mismatch && (
        <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>Passwords do not match</p>
      )}
    </div>
  );
}

function ResetSubmitButton({ loading }) {
  return (
    <button
      type="submit" disabled={loading}
      style={{ padding: '13px', backgroundColor: loading ? '#6ea8da' : ACCENT, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      {loading ? <LoadingSpinner size={20} inline /> : 'Reset Password'}
    </button>
  );
}

function ResetPasswordForm({ isDark, form, onFormChange, onSubmit, loading, error }) {
  const set = (key) => (e) => onFormChange({ ...form, [key]: e.target.value });

  return (
    <div style={cardStyles(isDark)}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: t(isDark, '#1a1a2e', '#f1f5f9'), marginBottom: '6px' }}>
          Set New Password
        </h1>
        <p style={{ fontSize: '13px', color: t(isDark, '#9ca3af', '#64748b') }}>
          Choose a strong password for your account
        </p>
      </div>

      <ErrorBanner isDark={isDark} message={error} />

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <NewPasswordField
          isDark={isDark}
          value={form.newPassword}
          onChange={set('newPassword')}
        />
        <ConfirmPasswordField
          isDark={isDark}
          value={form.confirm}
          newPassword={form.newPassword}
          onChange={set('confirm')}
        />
        <ResetSubmitButton loading={loading} />
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: t(isDark, '#9ca3af', '#475569') }}>
        Remember it?{' '}
        <a href="/login" style={{ color: t(isDark, ACCENT, '#60a5fa'), fontWeight: '500' }}>Sign in</a>
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const { theme, toggleTheme }  = useTheme();
  const isDark                  = theme === 'dark';
  const navigate                = useNavigate();

  const [form,       setForm]       = useState({ newPassword: '', confirm: '' });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [verifying,  setVerifying]  = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success,    setSuccess]    = useState(false);

  // Verify token on page load
  useEffect(() => {
    if (!token) { setVerifying(false); setTokenValid(false); return; }
    (async () => {
      try {
        await api.get(`/auth/verify-reset-token/${token}`);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) { setError('Passwords do not match.'); return; }
    if (!allRulesPass(form.newPassword))   { setError('Password does not meet all requirements.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err.response?.data?.description || err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying)               return <VerifyingScreen  isDark={isDark} />;
  if (!token || !tokenValid)   return <InvalidTokenScreen isDark={isDark} />;
  if (success)                 return <SuccessScreen    isDark={isDark} />;

  return (
    <div style={containerStyles(isDark)}>
      <BackgroundBlobs isDark={isDark} />
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      <ResetPasswordForm
        isDark={isDark}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
}