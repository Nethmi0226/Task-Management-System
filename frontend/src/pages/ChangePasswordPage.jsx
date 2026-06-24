import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Layout from '../components/layout/Layout.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT             = '#0078d4';
const REDIRECT_DELAY_MS  = 2000;
const POST_CHANGE_ROUTE  = '/home';

const PASSWORD_RULES = [
  { label: 'At least 8 characters',           test: v => v.length >= 8 },
  { label: 'One uppercase letter',             test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter',             test: v => /[a-z]/.test(v) },
  { label: 'One number',                       test: v => /\d/.test(v) },
  { label: 'One special character (@$!%*?&#)', test: v => /[@$!%*?&#]/.test(v) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(isDark, light, dark) { return isDark ? dark : light; }

function allRulesPass(password) {
  return PASSWORD_RULES.every(r => r.test(password));
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputBase = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeading({ mustChange }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
        {mustChange ? '🔒 Set New Password' : '🔒 Change Password'}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {mustChange ? 'You must set a new password before continuing.' : 'Update your account password.'}
      </p>
    </div>
  );
}

function SuccessBanner() {
  return (
    <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '10px', padding: '12px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
      ✅ Password changed successfully. Redirecting...
    </div>
  );
}

function ErrorBanner({ isDark, message }) {
  if (!message) return null;
  return (
    <div style={{ backgroundColor: t(isDark, '#fef2f2', 'rgba(239,68,68,0.12)'), border: '1px solid rgba(239,68,68,0.3)', color: t(isDark, '#dc2626', '#f87171'), borderRadius: '10px', padding: '12px', fontSize: '13px', marginBottom: '16px' }}>
      ⚠️ {message}
    </div>
  );
}

function PasswordRules({ password }) {
  if (!password) return null;
  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {PASSWORD_RULES.map(r => {
        const passes = r.test(password);
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: passes ? '#10b981' : 'var(--text-muted)' }}>
            <span>{passes ? '✅' : '⭕'}</span>
            {r.label}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
      {children}
    </label>
  );
}

function NewPasswordField({ value, showPass, onToggleShow, onChange }) {
  return (
    <div>
      <FieldLabel>New Password</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          type={showPass ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Enter new password"
          style={{ ...inputBase, paddingRight: '40px' }}
        />
        <button
          type="button" onClick={onToggleShow}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}
        >
          {showPass ? '🙈' : '👁️'}
        </button>
      </div>
      <PasswordRules password={value} />
    </div>
  );
}

function ConfirmPasswordField({ value, newPassword, onChange }) {
  const mismatch = value && value !== newPassword;
  return (
    <div>
      <FieldLabel>Confirm Password</FieldLabel>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Confirm new password"
        style={{ ...inputBase, border: `1px solid ${mismatch ? '#ef4444' : 'var(--border)'}` }}
      />
      {mismatch && (
        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>
      )}
    </div>
  );
}

function SubmitButton({ loading, disabled }) {
  return (
    <button
      type="submit" disabled={disabled}
      style={{ padding: '13px', backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? <LoadingSpinner size={20} inline /> : 'Change Password'}
    </button>
  );
}

function ChangePasswordForm({ isDark, form, onFormChange, onSubmit, loading, error, success, showPass, onToggleShow }) {
  const setField = (key) => (value) => onFormChange({ ...form, [key]: value });

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
      <PageHeading mustChange={false} />

      {success && <SuccessBanner />}
      <ErrorBanner isDark={isDark} message={error} />

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <NewPasswordField
          value={form.newPassword}
          showPass={showPass}
          onToggleShow={onToggleShow}
          onChange={setField('newPassword')}
        />
        <ConfirmPasswordField
          value={form.confirm}
          newPassword={form.newPassword}
          onChange={setField('confirm')}
        />
        <SubmitButton loading={loading} disabled={loading || success} />
      </form>
    </div>
  );
}

// Forced flow: user must change password before they can access anything else.
// Renders without the Layout shell so there's no nav/sidebar.
function MustChangePasswordView({ isDark, form, onFormChange, onSubmit, loading, error, success, showPass, onToggleShow }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          <PageHeading mustChange />

          {success && <SuccessBanner />}
          <ErrorBanner isDark={isDark} message={error} />

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <NewPasswordField
              value={form.newPassword}
              showPass={showPass}
              onToggleShow={onToggleShow}
              onChange={(v) => onFormChange({ ...form, newPassword: v })}
            />
            <ConfirmPasswordField
              value={form.confirm}
              newPassword={form.newPassword}
              onChange={(v) => onFormChange({ ...form, confirm: v })}
            />
            <SubmitButton loading={loading} disabled={loading || success} />
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const navigate       = useNavigate();
  const { theme }      = useTheme();
  const { user }       = useAuth();
  const isDark         = theme === 'dark';

  const [form,     setForm]     = useState({ newPassword: '', confirm: '' });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) { setError('Passwords do not match.'); return; }
    if (!allRulesPass(form.newPassword))   { setError('Password does not meet all requirements.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate(POST_CHANGE_ROUTE), REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err.response?.data?.description || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const sharedProps = { isDark, form, onFormChange: setForm, onSubmit: handleSubmit, loading, error, success, showPass, onToggleShow: () => setShowPass(p => !p) };

  if (user?.mustChangePassword) {
    return <MustChangePasswordView {...sharedProps} />;
  }

  return (
    <Layout>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <ChangePasswordForm {...sharedProps} />
      </div>
    </Layout>
  );
}
