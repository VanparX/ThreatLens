import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Bell,
  LogOut,
  User,
  Sun,
  Moon,
  Clock,
  Wifi,
  WifiOff,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuthTransition } from '../context/AuthTransitionContext';
import LogoutConfirmationModal from './auth/LogoutConfirmationModal';
import { formatIST } from '../utils/dateUtils';
import axios from 'axios';

const ROUTE_META = {
  '/command-hub':   { group: 'OPERATIONS', title: 'Command Hub' },
  '/dashboard':     { group: 'OPERATIONS', title: 'Security Overview' },
  '/logs':          { group: 'OPERATIONS', title: 'Security Logs' },
  '/detections':    { group: 'THREAT INTEL', title: 'Threat Detections' },
  '/alerts':        { group: 'THREAT INTEL', title: 'Detections & Alerts' },
  '/incidents':     { group: 'THREAT INTEL', title: 'Incident Response' },
  '/rules':         { group: 'THREAT INTEL', title: 'Detection Rules' },
  '/notifications': { group: 'GOVERNANCE', title: 'Notifications' },
  '/users':         { group: 'GOVERNANCE', title: 'User Management' },
  '/audit':         { group: 'GOVERNANCE', title: 'Audit Trail' },
};

export default function Navbar({ onToggleMobileNav, mobileNavOpen = false }) {
  const { user, logout, isAdmin, isAnalyst } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { startLogoutTransition } = useAuthTransition();
  const location = useLocation();
  const navigate = useNavigate();

  const [backendStatus, setBackendStatus] = useState('unknown'); // 'up' | 'down' | 'unknown'
  const [timeStr, setTimeStr] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // IST clock (Asia/Kolkata) - Real-time tick
  useEffect(() => {
    const tick = () => {
      setTimeStr(formatIST(new Date()));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Actual backend health check only (No simulated or fabricated telemetry)
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await axios.get('/actuator/health');
        if (!mounted) return;
        const s = (res?.data?.status || '').toUpperCase();
        setBackendStatus(s === 'UP' || s === 'OK' ? 'up' : 'down');
      } catch {
        if (mounted) setBackendStatus('down');
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const routeMeta = ROUTE_META[location.pathname] || { group: 'SOC', title: 'ThreatLens SOC' };
  const roleLabel = isAdmin ? 'Admin' : (isAnalyst ? 'Analyst' : 'Viewer');

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    if (isLoggingOut) return;
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setShowLogoutModal(false);

    // 1. Trigger coordinated logout transition sequence
    startLogoutTransition(() => {
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    });

    // 2. Clear session immediately. Session invalidation does NOT wait for animation.
    logout();
  };

  return (
    <header className="topbar">
      {/* Left: Mobile Nav Hamburger + ThreatLens Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {onToggleMobileNav && (
          <button
            type="button"
            className="btn btn-ghost btn-icon mobile-menu-toggle"
            onClick={onToggleMobileNav}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            title={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        )}

        <button
          type="button"
          className="topbar-brand"
          onClick={() => navigate('/command-hub')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          title="ThreatLens SOC Console Home"
        >
          <span className="topbar-brand-icon">
            <Shield size={15} style={{ color: 'var(--tl-accent-primary)' }} />
          </span>
          <span className="topbar-brand-name">ThreatLens</span>
          <span className="topbar-brand-tag">SOC</span>
        </button>
      </div>

      {/* Center: Breadcrumb context + Real Backend Health Status + IST Clock */}
      <div className="topbar-center">
        {/* Breadcrumb Context */}
        <div
          className="topbar-breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            paddingRight: '0.75rem',
            borderRight: '1px solid var(--tl-border-subtle)',
            fontSize: '0.75rem'
          }}
        >
          <span style={{ color: 'var(--tl-text-muted)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            {routeMeta.group}
          </span>
          <ChevronRight size={11} style={{ color: 'var(--tl-text-muted)', opacity: 0.7 }} />
          <span style={{ color: 'var(--tl-text-primary)', fontWeight: 600 }}>
            {routeMeta.title}
          </span>
        </div>

        {/* Real Backend API Status Indicator */}
        <span
          className="status-chip"
          title={
            backendStatus === 'up'
              ? 'Backend Spring Boot API is healthy and reachable'
              : backendStatus === 'down'
                ? 'Backend Spring Boot API is unreachable (/actuator/health failed)'
                : 'Checking backend connectivity…'
          }
        >
          <span
            className={`status-dot ${
              backendStatus === 'up'
                ? 'status-dot-online'
                : backendStatus === 'down'
                  ? 'status-dot-error'
                  : 'status-dot-neutral'
            }`}
          />
          <span style={{ fontSize: '0.714rem', fontWeight: 500 }}>
            {backendStatus === 'up' ? 'API Online' : backendStatus === 'down' ? 'API Offline' : 'Connecting…'}
          </span>
          {backendStatus === 'up' ? (
            <Wifi size={11} style={{ color: 'var(--tl-sev-low)' }} />
          ) : backendStatus === 'down' ? (
            <WifiOff size={11} style={{ color: 'var(--tl-sev-critical)' }} />
          ) : null}
        </span>

        {/* Live IST Real-Time Clock */}
        <span
          className="status-chip topbar-clock"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.714rem' }}
          title="Indian Standard Time (IST) / Asia/Kolkata (UTC+05:30)"
        >
          <Clock size={11} style={{ color: 'var(--tl-text-muted)' }} />
          <span>{timeStr || 'Loading IST…'}</span>
        </span>
      </div>

      {/* Right: Actions (Theme Toggle, Notifications, Operator Chip, Logout) */}
      <div className="topbar-right">
        {/* Dual-Theme Toggle */}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Titanium Light mode' : 'Switch to Charcoal Dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification Channel Settings */}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/notifications')}
          title="Notification Channel Settings"
          aria-label="Notification settings"
          style={{
            color: location.pathname === '/notifications' ? 'var(--tl-accent-primary)' : undefined,
            background: location.pathname === '/notifications' ? 'var(--tl-accent-subtle)' : undefined
          }}
        >
          <Bell size={15} />
        </button>

        {/* Operator Badge Chip */}
        <div
          className="operator-chip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.55rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--tl-border-default)',
            background: 'var(--tl-bg-surface-elev)',
            fontSize: '0.764rem'
          }}
        >
          <User size={12} style={{ color: 'var(--tl-text-secondary)' }} />
          <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
            {user?.username || 'Analyst'}
          </span>
          <span
            className={`badge badge-${isAdmin ? 'high' : 'neutral'}`}
            style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem' }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Sign Out Action */}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={handleOpenLogoutModal}
          title="Sign out of SOC Console"
          aria-label="Sign out"
          disabled={isLoggingOut}
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* SOC Session Termination Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
    </header>
  );
}
