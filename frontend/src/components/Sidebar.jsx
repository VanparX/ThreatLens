import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  AlertTriangle,
  Flame,
  Sliders,
  Mail,
  FileText
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'SOC Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'logs', label: 'Log Stream & Simulator', icon: Terminal, badge: 'Live' },
    { id: 'alerts', label: 'Alert Center', icon: AlertTriangle, badge: null },
    { id: 'incidents', label: 'Incident Response', icon: Flame, badge: null },
    { id: 'rules', label: 'Detection Rules', icon: Sliders, badge: null },
    { id: 'notifications', label: 'Alert Channels (Email/SMS)', icon: Mail, badge: null },
    { id: 'audit', label: 'SOC Audit Logs', icon: FileText, badge: null }
  ];

  return (
    <aside style={{
      width: '260px',
      borderRight: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: 'calc(100vh - 64px)',
      padding: '1.25rem 0.85rem'
    }}>
      <div>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 0.75rem 0.6rem 0.75rem'
        }}>
          Security Operations
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '9px',
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  border: isActive ? '1px solid var(--neon-cyan)' : '1px solid transparent',
                  color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} color={isActive ? 'var(--neon-cyan)' : 'var(--text-muted)'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.62rem',
                    background: 'var(--badge-low-bg)',
                    color: 'var(--badge-low-text)',
                    border: '1px solid var(--badge-low-border)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.85rem',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.3rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-cyan)' }} />
          <span>ThreatLens SIEM Engine</span>
        </div>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          Autonomous security event triage, risk scoring & automated mitigation active.
        </p>
      </div>
    </aside>
  );
}
