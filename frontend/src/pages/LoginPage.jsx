import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ThemeContext } from '../context/ThemeContext.jsx';
import api from '../api/axios.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    // Do NOT clear error here — let the user read it while they correct their input
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clear previous error only when user tries again
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      if (res.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/home');
      }
    } catch (err) {
      const msg =
        err.response?.data?.description ||
        err.response?.data?.message ||
        'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: "url('/network-bg.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      padding: '40px',
      gap: '8%',
      flexWrap: 'wrap'
    }}>

      {/* Inject animation styles */}
      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-left {
          animation: fadeInLeft 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-right {
          animation: fadeInRight 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @media (max-width: 768px) {
          .desktop-text { display: none; }
        }
      `}</style>

      {/* Dark overlay for better readability on background image */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(1px)', zIndex: 0 }} />

      {/* Animated background blobs (optional, but keep them for extra effect) */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: isDark ? 'rgba(59,158,237,0.1)' : 'rgba(0,120,212,0.15)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '350px', height: '350px', borderRadius: '50%', backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)', filter: 'blur(60px)' }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10, background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#fff' : '#111', transition: 'all 0.2s', fontSize: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Left side text */}
      <div className="animate-left desktop-text" style={{ zIndex: 1, color: '#fff', maxWidth: '500px', padding: '20px' }}>
        <h1 style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1.2', marginBottom: '24px', textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          Welcome to Planora<br />
          <span style={{ color: '#60a5fa' }}>Task Management System</span><br />
        </h1>
        <p style={{ fontSize: '20px', color: '#cbd5e1', textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: '1.6' }}>
          Organize, track, and collaborate on your tasks efficiently. Sign in to continue to your Planora workspace.
        </p>
      </div>

      {/* Card */}
      <div className="animate-right" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '48px 40px', width: '100%', maxWidth: '440px', boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.15)', position: 'relative', zIndex: 1, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}` }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', backgroundColor: isDark ? 'rgba(59,158,237,0.15)' : 'rgba(0,120,212,0.1)', borderRadius: '18px', marginBottom: '20px' }}>
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="3" fill="#6EE7B7" />
              <rect x="20" y="4" width="12" height="12" rx="3" fill="#34D399" opacity="0.8" />
              <rect x="4" y="20" width="12" height="12" rx="3" fill="#34D399" opacity="0.8" />
              <rect x="20" y="20" width="12" height="12" rx="3" fill="#6EE7B7" />
            </svg>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1a1a2e', margin: '0 0 8px' }}>Welcome back</h1>
          <p style={{ fontSize: '15px', color: isDark ? '#94a3b8' : '#6b7280', margin: 0 }}>Sign in to your Planora workspace</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : '#fecaca'}`,
            color: isDark ? '#f87171' : '#dc2626',
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '14px',
            marginBottom: '24px',
            lineHeight: '1.45',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#cbd5e1' : '#374151' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#64748b' : '#9ca3af', display: 'flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 7 10-7" /></svg>
              </span>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" autoComplete="email"
                style={{ width: '100%', padding: '13px 14px 13px 44px', borderRadius: '12px', border: `1px solid ${error ? (isDark ? 'rgba(239,68,68,0.5)' : '#fca5a5') : (isDark ? '#475569' : '#d1d5db')}`, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff', color: isDark ? '#f1f5f9' : '#1a1a2e', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#cbd5e1' : '#374151' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#64748b' : '#9ca3af', display: 'flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </span>
              <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange}
                placeholder="Enter your password" autoComplete="current-password"
                style={{ width: '100%', padding: '13px 44px 13px 44px', borderRadius: '12px', border: `1px solid ${error ? (isDark ? 'rgba(239,68,68,0.5)' : '#fca5a5') : (isDark ? '#475569' : '#d1d5db')}`, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff', color: isDark ? '#f1f5f9' : '#1a1a2e', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#64748b' : '#9ca3af', display: 'flex', padding: 0 }}>
                {showPass
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                }
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-10px' }}>
            <a href="/forgot-password" style={{ fontSize: '14px', color: isDark ? '#60a5fa' : '#0078d4', textDecoration: 'none', fontWeight: '600' }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '14px', backgroundColor: loading ? '#6ea8da' : '#0078d4', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s', marginTop: '4px' }}>
            {loading ? <LoadingSpinner size={22} inline /> : (
              <>Sign In <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: isDark ? '#64748b' : '#9ca3af', fontWeight: '500' }}>
          Planora
        </p>
      </div>
    </div>
  );
}