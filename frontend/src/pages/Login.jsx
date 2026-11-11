import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function getDestination(from) {
  if (!from) return '/command-hub';
  if (typeof from === 'string') {
    return from !== '/login' ? from : '/command-hub';
  }
  const pathname = from.pathname;
  if (!pathname || pathname === '/login') return '/command-hub';
  const search = from.search || '';
  const hash = from.hash || '';
  return `${pathname}${search}${hash}`;
}

export default function Login() {
  const { login, loading } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      const dest = getDestination(location.state?.from);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    }
  };

  const prefill = () => { setUsername('admin'); setPassword('ChangeMe!Admin123'); };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative'
    }}>
      {/* Theme toggle */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={toggleTheme}
        style={{ position: 'absolute', top: '1rem', right: '1rem' }}
        title={isDark ? 'Light mode' : 'Dark mode'}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-elevated)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.07rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>ThreatLens</div>
              <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Operations Center</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.07rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Sign in</h1>
            <p style={{ fontSize: '0.786rem', color: 'var(--text-muted)' }}>Enter your credentials to access the monitoring console.</p>
          </div>
        </div>

        {/* Form */}
        <div className="panel">
          <div className="panel-body">
            {error && (
              <div className="inline-feedback error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-username">Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Username"
                    className="form-input"
                    style={{ paddingLeft: '2.1rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="form-input"
                    style={{ paddingLeft: '2.1rem', paddingRight: '2.4rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.6rem 1rem', marginTop: '0.25rem' }}>
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}
              </button>
            </form>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default admin account</span>
            <button
              type="button"
              onClick={prefill}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem' }}
            >
              Prefill credentials
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.714rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          All activity is recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
