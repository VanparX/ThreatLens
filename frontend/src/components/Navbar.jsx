import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Bell, LogOut, User, Sun, Moon, Clock, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatIST } from '../utils/dateUtils';
import axios from 'axios';

const ROUTE_TITLES = {
  '/command-hub':   'Command Hub',
  '/dashboard':     'Security Overview',
  '/logs':          'Security Logs',
  '/detections':    'Threat Detections',
  '/alerts':        'Detections & Alerts',
  '/incidents':     'Incident Response',
  '/rules':         'Detection Rules',
  '/notifications': 'Notifications',
  '/audit':         'Audit Trail',
};

export default function Navbar() {
  const { user, logout, isAdmin, isAnalyst } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [backendStatus, setBackendStatus] = useState('unknown'); // 'up' | 'down' | 'unknown'
  const [timeStr, setTimeStr] = useState('');

  // IST clock (Asia/Kolkata)
  useEffect(() => {
    const tick = () => {
      setTimeStr(formatIST(new Date()));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Real health check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get('/actuator/health');
        const s = (res?.data?.status || '').toUpperCase();
        setBackendStatus(s === 'UP' || s === 'OK' ? 'up' : 'down');
      } catch {
        setBackendStatus('down');
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  const currentTitle = ROUTE_TITLES[location.pathname] || 'ThreatLens SOC';
  const roleLabel = isAdmin ? 'Admin' : (isAnalyst ? 'Analyst' : 'Viewer');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Brand */}
      <button
        className="topbar-brand"
        onClick={() => navigate('/command-hub')}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="topbar-brand-icon">
          <Shield size={15} />
        </span>
        <span className="topbar-brand-name">ThreatLens</span>
        <span className="topbar-brand-tag">SOC</span>
      </button>

      {/* Page context & backend status */}
      <div className="topbar-center">
        <span style={{ fontSize: '0.786rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
          {currentTitle}
        </span>
        <span
          className="status-chip"
          title={backendStatus === 'up' ? 'Backend API healthy' : backendStatus === 'down' ? 'Backend unreachable' : 'Checking backend...'}
        >
          <span className={`status-dot ${backendStatus === 'up' ? 'status-dot-online' : backendStatus === 'down' ? 'status-dot-error' : 'status-dot-neutral'}`} />
          {backendStatus === 'up' ? 'API Online' : backendStatus === 'down' ? 'API Offline' : 'Checking…'}
          {backendStatus === 'up' ? <Wifi size={11} style={{ color: 'var(--status-online)' }} /> : backendStatus === 'down' ? <WifiOff size={11} style={{ color: 'var(--status-error)' }} /> : null}
        </span>
        <span className="status-chip" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
          <Clock size={11} style={{ color: 'var(--text-muted)' }} />
          {timeStr || '…'}
        </span>
      </div>

      {/* Right actions */}
      <div className="topbar-right">
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/notifications')}
          title="Notification settings"
          aria-label="Notification settings"
          style={{ color: location.pathname === '/notifications' ? 'var(--text-primary)' : undefined }}
        >
          <Bell size={15} />
        </button>

        {/* User chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.25rem 0.55rem', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', background: 'var(--surface-elevated)',
          fontSize: '0.764rem', color: 'var(--text-secondary)'
        }}>
          <User size={12} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username || 'Analyst'}</span>
          <span style={{
            color: isAdmin ? 'var(--sev-high)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: 600
          }}>
            {roleLabel}
          </span>
        </div>

        <button
          className="btn btn-ghost btn-icon"
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
