import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../api/axios.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#0078d4';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function themed(isDark, light, dark) {
  return isDark ? dark : light;
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

function pageStyles(isDark) {
  return {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themed(isDark, '#f0f2f5', '#0f172a'),
    padding: '20px',
    fontFamily: "'Inter', sans-serif",
  };
}

function cardStyles(isDark) {
  return {
    backgroundColor: themed(isDark, '#fff', '#1e293b'),
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: themed(isDark, '0 8px 40px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.5)'),
    border: `1px solid ${themed(isDark, '#f1f5f9', '#334155')}`,
  };
}

function themeToggleStyles(isDark) {
  return {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: themed(isDark, 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)'),
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function emailInputStyles(isDark) {
  return {
    padding: '11px 14px',
    borderRadius: '10px',
    border: `1px solid ${themed(isDark, '#e5e7eb', '#334155')}`,
    backgroundColor: themed(isDark, '#f9fafb', '#0f172a'),
    color: themed(isDark, '#1a1a2e', '#f1f5f9'),
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} style={themeToggleStyles(isDark)}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function ErrorBanner({ isDark, message }) {
  if (!message) return null;
  return (
    <div style={{
      backgroundColor: themed(isDark, '#fef2f2', 'rgba(239,68,68,0.12)'),
      border: `1px solid ${themed(isDark, '#fecaca', 'rgba(239,68,68,0.3)')}`,
      color: themed(isDark, '#dc2626', '#f87171'),
      borderRadius: '10px',
      padding: '12px',
      fontSize: '13px',
      marginBottom: '16px',
    }}>
      ⚠️ {message}
    </div>
  );
}

function FormField({ isDark, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: '500', color: themed(isDark, '#374151', '#cbd5e1') }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: '13px',
        backgroundColor: loading ? '#6ea8da' : ACCENT,
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {loading ? <LoadingSpinner size={20} inline /> : 'Send Reset Link'}
    </button>
  );
}

function ForgotPasswordForm({ isDark, email, onEmailChange, onSubmit, loading, error }) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: themed(isDark, '#1a1a2e', '#f1f5f9'), marginBottom: '6px' }}>
          Forgot Password?
        </h1>
        <p style={{ fontSize: '13px', color: themed(isDark, '#9ca3af', '#64748b') }}>
          Enter your email and we will send a reset link
        </p>
      </div>

      <ErrorBanner isDark={isDark} message={error} />

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField isDark={isDark} label="Email Address">
          <input
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
            placeholder="you@example.com"
            style={emailInputStyles(isDark)}
          />
        </FormField>
        <SubmitButton loading={loading} />
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: themed(isDark, '#9ca3af', '#475569') }}>
        Remember your password?{' '}
        <a href="/login" style={{ color: themed(isDark, '#0078d4', '#60a5fa'), fontWeight: '500' }}>
          Sign in
        </a>
      </p>
    </>
  );
}

function EmailSentConfirmation({ isDark }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: themed(isDark, '#1a1a2e', '#f1f5f9'), marginBottom: '12px' }}>
        Check your email
      </h2>
      <p style={{ fontSize: '13px', color: themed(isDark, '#6b7280', '#64748b'), lineHeight: '1.6', marginBottom: '24px' }}>
        If your email is registered, you will receive a password reset link shortly. The link expires in 15 minutes.
      </p>
      <a
        href="/login"
        style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: ACCENT, color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}
      >
        Back to Login
      </a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

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

  return (
    <div style={pageStyles(isDark)}>
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      <div style={cardStyles(isDark)}>
        {sent
          ? <EmailSentConfirmation isDark={isDark} />
          : <ForgotPasswordForm
              isDark={isDark}
              email={email}
              onEmailChange={setEmail}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
            />
        }
      </div>
    </div>
  );
}
