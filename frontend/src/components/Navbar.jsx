import React, { useState, useEffect } from 'react';
import { Shield, Radio, Bell, LogOut, User, Server, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';

export default function Navbar({ onNavigate, activeTab }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [systemHealth, setSystemHealth] = useState('UP');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/actuator/health');
        setSystemHealth(res.status || 'UP');
      } catch {
        setSystemHealth('DEGRADED');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--header-bg)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      {/* Brand & Platform Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
          padding: '0.5rem',
          borderRadius: '10px',
          border: '1px solid var(--neon-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Shield size={22} color="var(--neon-cyan)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Threat<span style={{ color: 'var(--neon-cyan)' }}>Lens</span>
            </span>
            <span style={{
              fontSize: '0.65rem',
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--neon-cyan)',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid var(--neon-cyan)',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>SOC v1.0</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Automated Threat Detection & Incident Response
          </p>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Backend Connectivity Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          padding: '0.35rem 0.75rem',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s ease'
        }}>
          <span className={systemHealth === 'UP' ? 'pulse-indicator' : 'pulse-indicator-danger'} />
          <Server size={14} color="var(--text-muted)" />
          <span>Core Engine: <strong style={{ color: systemHealth === 'UP' ? 'var(--neon-emerald)' : 'var(--neon-rose)' }}>{systemHealth}</strong></span>
        </div>

        {/* Real-time UTC Telemetry Clock */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--neon-cyan)',
          background: 'var(--bg-secondary)',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          transition: 'all 0.2s ease'
        }}>
          <Radio size={13} color="var(--neon-cyan)" />
          <span>{currentTime || 'SYNCHRONIZING...'}</span>
        </div>
      </div>

      {/* Analyst Profile & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: isDark ? '#fbbf24' : '#0284c7',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => onNavigate('notifications')}
          title="Notification Settings (Email & SMS)"
          style={{
            background: activeTab === 'notifications' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
            border: activeTab === 'notifications' ? '1px solid var(--neon-cyan)' : '1px solid var(--border-color)',
            borderRadius: '8px',
            color: activeTab === 'notifications' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <Bell size={18} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'var(--bg-secondary)',
          padding: '0.35rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={15} color="var(--neon-cyan)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {user?.username || 'Analyst'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {isAdmin ? 'ADMINISTRATOR' : 'SOC_ANALYST'}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Logout"
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
        >
          <LogOut size={14} />
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}
