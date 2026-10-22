import React, { useState, useEffect } from 'react';
import { Shield, Radio, Bell, LogOut, User, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Navbar({ onNavigate, activeTab }) {
  const { user, logout, isAdmin } = useAuth();
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
      background: 'rgba(13, 19, 31, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem'
    }}>
      {/* Brand & Platform Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.2))',
          padding: '0.5rem',
          borderRadius: '10px',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Shield size={22} color="var(--neon-cyan)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              Threat<span style={{ color: 'var(--neon-cyan)' }}>Lens</span>
            </span>
            <span style={{
              fontSize: '0.65rem',
              background: 'rgba(0, 240, 255, 0.1)',
              color: 'var(--neon-cyan)',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid rgba(0, 240, 255, 0.25)',
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
          border: '1px solid var(--border-color)'
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
          background: 'rgba(0, 240, 255, 0.05)',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <Radio size={13} color="var(--neon-cyan)" />
          <span>{currentTime || 'SYNCHRONIZING...'}</span>
        </div>
      </div>

      {/* Analyst Profile & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => onNavigate('notifications')}
          title="Notification Settings (Email & SMS)"
          style={{
            background: activeTab === 'notifications' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
            border: activeTab === 'notifications' ? '1px solid var(--neon-cyan)' : '1px solid var(--border-color)',
            borderRadius: '8px',
            color: activeTab === 'notifications' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
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
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={15} color="var(--neon-cyan)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
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
