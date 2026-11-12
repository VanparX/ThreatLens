import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuthTransition } from '../context/AuthTransitionContext';
import CyberSecurityAnimation from '../components/CyberSecurityAnimation';

/**
 * Resolves post-login navigation destination.
 */
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

/**
 * Login — Concept A: Precision SOC Console
 *
 * Dedicated Motion Design & Premium Cybersecurity Authentication Gateway.
 * Two-panel layout featuring the Cyber Threat Intelligence Network visualization on the left
 * and the refined SOC authentication form on the right.
 */
export default function Login({
  initialUsername = '',
  initialPassword = '',
  initialError = '',
  initialLoading = false
} = {}) {
  const { login, loading: authLoading } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { startLoginTransition, isTransitioning } = useAuthTransition();
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(initialError);
  const [localSubmitting, setLocalSubmitting] = useState(initialLoading);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const isSubmitting = authLoading || localSubmitting || isTransitioning || loginSuccess;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setLocalSubmitting(true);
    try {
      await login(username, password);
      // Backend validates credentials & AuthContext establishes authenticated session.
      // Once authenticated, initiate the coordinated login transition sequence.
      setLoginSuccess(true);
      startLoginTransition(() => {
        const dest = getDestination(location.state?.from);
        navigate(dest, { replace: true });
      });
    } catch (err) {
      setError(err?.message || 'Authentication failed. Check your credentials.');
      setLoginSuccess(false);
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <div
      className="threatlens-login-root"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--tl-bg-canvas, #0B0D10)',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      <style>{`
        .login-grid-container {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          width: 100%;
          min-height: 100vh;
        }

        .login-visual-panel {
          background: linear-gradient(145deg, var(--tl-bg-canvas, #0B0D10) 0%, var(--tl-bg-surface, #13171D) 100%);
          border-right: 1px solid var(--tl-border-subtle, #1E232B);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          padding: 2.75rem 3rem;
          position: relative;
          overflow: hidden;
        }

        .login-form-panel {
          background: var(--tl-bg-surface, #13171D);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          padding: 2.75rem 3rem;
          position: relative;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .login-grid-container {
            grid-template-columns: 1fr 1fr;
          }
          .login-visual-panel {
            padding: 2rem 1.75rem;
          }
          .login-form-panel {
            padding: 2rem 1.75rem;
          }
        }

        @media (max-width: 768px) {
          .login-grid-container {
            display: flex;
            flex-direction: column;
          }
          .login-visual-panel {
            display: none;
          }
          .login-form-panel {
            min-height: 100vh;
            justifyContent: center;
            padding: 2rem 1.25rem;
          }
        }
      `}</style>

      {/* Main Two-Panel Responsive Container */}
      <div className="login-grid-container">
        {/* ============================================================
            LEFT PANEL: CYBERSECURITY VISUALIZATION & SOC BRANDING
            ============================================================ */}
        <div className="login-visual-panel">
          {/* Brand Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-lg, 8px)',
                  background: 'var(--tl-bg-surface-elev, #1A1F26)',
                  border: '1px solid var(--tl-accent-border, rgba(99, 102, 241, 0.28))',
                  boxShadow: '0 0 16px var(--tl-accent-glow, rgba(99, 102, 241, 0.25))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--tl-accent-primary, #6366F1)'
                }}
              >
                <Shield size={22} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '1.28rem',
                    fontWeight: 700,
                    color: 'var(--tl-text-primary, #F1F5F9)',
                    letterSpacing: '-0.02em',
                    display: 'block',
                    lineHeight: 1.15
                  }}
                >
                  ThreatLens
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--tl-accent-primary, #6366F1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 600
                  }}
                >
                  Security Threat Monitoring &amp; Incident Response
                </span>
              </div>
            </div>
          </div>

          {/* Centerpiece: Original Cyber Threat Intelligence Network Animation */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem 0',
              zIndex: 1
            }}
          >
            <CyberSecurityAnimation />
          </div>

          {/* Footer Philosophy & Precision Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', zIndex: 2 }}>
            <div
              style={{
                fontSize: '1.02rem',
                fontWeight: 600,
                color: 'var(--tl-text-primary, #F1F5F9)',
                letterSpacing: '-0.01em'
              }}
            >
              See threats clearly. Respond with confidence.
            </div>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--tl-text-muted, #78889B)',
                margin: 0,
                lineHeight: 1.5,
                maxWidth: '460px'
              }}
            >
              Monitor threats. Investigate incidents. Strengthen your security posture. Enterprise SOC operations powered by correlation heuristics and forensic auditing.
            </p>
          </div>
        </div>

        {/* ============================================================
            RIGHT PANEL: SOC AUTHENTICATION FORM
            ============================================================ */}
        <div className="login-form-panel">
          {/* Top Bar with Theme Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light console theme' : 'Switch to dark console theme'}
              aria-label={isDark ? 'Switch to light console theme' : 'Switch to dark console theme'}
              style={{
                color: 'var(--tl-text-secondary, #94A3B8)',
                border: '1px solid var(--tl-border-subtle, #1E232B)',
                background: 'var(--tl-bg-surface-elev, #1A1F26)'
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Centered Form Wrapper */}
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '1rem 0'
            }}
          >
            {/* Header / Context Intro */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--tl-accent-primary, #6366F1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700
                  }}
                >
                  THREATLENS // SOC ACCESS GATEWAY
                </span>
              </div>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: 'var(--tl-text-primary, #F1F5F9)',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}
              >
                Welcome Back
              </h1>
              <p
                style={{
                  fontSize: '0.814rem',
                  color: 'var(--tl-text-secondary, #94A3B8)',
                  margin: 0,
                  lineHeight: 1.45
                }}
              >
                Sign in to access your security operations workspace.
              </p>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div
                className="inline-feedback error"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  background: 'var(--tl-sev-critical-bg, rgba(239, 68, 68, 0.12))',
                  border: '1px solid var(--tl-sev-critical-border, rgba(239, 68, 68, 0.28))',
                  borderRadius: 'var(--radius-md, 6px)',
                  color: 'var(--tl-sev-critical, #EF4444)',
                  fontSize: '0.814rem'
                }}
                role="alert"
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Authentication Form Card */}
            <div
              className="panel"
              style={{
                border: '1px solid var(--tl-border-default, #282E38)',
                boxShadow: 'var(--tl-shadow-md, 0 2px 8px rgba(0, 0, 0, 0.55))'
              }}
            >
              <div className="panel-body" style={{ padding: '1.25rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Username / Email Input */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label
                      className="form-label"
                      htmlFor="login-username"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary, #F1F5F9)' }}
                    >
                      Username or Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--tl-text-muted, #78889B)'
                        }}
                      />
                      <input
                        id="login-username"
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username or email"
                        className="form-input"
                        disabled={isSubmitting}
                        style={{
                          paddingLeft: '2.3rem',
                          fontSize: '0.82rem',
                          height: '38px',
                          border: '1px solid var(--tl-border-default, #282E38)',
                          background: 'var(--tl-bg-canvas, #0B0D10)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Password Input with Show/Hide Toggle */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label
                      className="form-label"
                      htmlFor="login-password"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary, #F1F5F9)' }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--tl-text-muted, #78889B)'
                        }}
                      />
                      <input
                        id="login-password"
                        type={showPw ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="form-input"
                        disabled={isSubmitting}
                        style={{
                          paddingLeft: '2.3rem',
                          paddingRight: '2.5rem',
                          fontSize: '0.82rem',
                          height: '38px',
                          border: '1px solid var(--tl-border-default, #282E38)',
                          background: 'var(--tl-bg-canvas, #0B0D10)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        style={{
                          position: 'absolute',
                          right: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--tl-text-muted, #78889B)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.2rem'
                        }}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        tabIndex={0}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.65rem 1rem',
                      marginTop: '0.25rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      gap: '0.5rem',
                      boxShadow: '0 0 12px var(--tl-accent-glow, rgba(99, 102, 241, 0.25))'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Compliance & Audit Trail Disclosure */}
            <p
              style={{
                fontSize: '0.714rem',
                color: 'var(--tl-text-muted, #78889B)',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.45
              }}
            >
              Authentication attempts and session activities are recorded in the ThreatLens application audit log.
            </p>
          </div>

          {/* Bottom Space / Status Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--tl-text-muted, #78889B)',
              fontFamily: 'var(--font-mono, monospace)',
              borderTop: '1px solid var(--tl-border-subtle, #1E232B)',
              paddingTop: '1rem'
            }}
          >
            <span>PLATFORM: THREATLENS v1.0</span>
            <span>CLEARANCE: RBAC ENFORCED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
