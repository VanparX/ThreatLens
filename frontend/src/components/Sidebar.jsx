import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ScrollText,
  AlertTriangle,
  Flame,
  Sliders,
  Bell,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Server,
  Zap,
  Terminal,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: 'OPERATIONS',
    items: [
      { id: 'hub',       label: 'Command Hub',       icon: Shield,          badge: 'Portal' },
      { id: 'dashboard', label: 'Security Overview', icon: LayoutDashboard },
      { id: 'logs',      label: 'Security Logs',     icon: ScrollText,      badge: 'Live', badgeType: 'live' },
    ]
  },
  {
    title: 'THREAT INTELLIGENCE & SOAR',
    items: [
      { id: 'alerts',    label: 'Detections & Alerts', icon: AlertTriangle },
      { id: 'incidents', label: 'Incident Response',   icon: Flame,         badge: 'SOAR' },
      { id: 'rules',     label: 'Detection Rules',     icon: Sliders,       badge: '4 Armed' },
    ]
  },
  {
    title: 'GOVERNANCE & CHANNELS',
    items: [
      { id: 'notifications', label: 'Notifications',  icon: Bell },
      { id: 'audit',         label: 'Audit Trail',    icon: FileText },
    ]
  }
];

export default function Sidebar({ activeTab, onSelectTab }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin } = useAuth();
  const [epsRate, setEpsRate] = useState(1540);

  // Subtle fluctuation to make telemetry feel real and active
  useEffect(() => {
    const iv = setInterval(() => {
      setEpsRate(prev => Math.floor(1500 + Math.random() * 80));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}`}
      aria-label="Main navigation"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: collapsed ? '56px' : '230px',
        minWidth: collapsed ? '56px' : '230px'
      }}
    >
      {/* Top / Main Navigation Section */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <nav style={{ padding: '0.4rem 0' }}>
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '0.75rem' }}>
              {!collapsed && (
                <div className="sidebar-section-label" style={{ fontSize: '0.62rem', letterSpacing: '0.08em', padding: '0.5rem 0.9rem 0.25rem 0.9rem' }}>
                  {section.title}
                </div>
              )}

              {section.items.map(({ id, label, icon: Icon, badge, badgeType }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    onClick={() => onSelectTab(id)}
                    title={collapsed ? label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    style={{ padding: '0.45rem 0.85rem' }}
                  >
                    <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                    {!collapsed && (
                      <>
                        <span className="nav-label" style={{ fontSize: '0.82rem' }}>{label}</span>
                        {badge && (
                          <span
                            className="nav-badge"
                            style={{
                              background: badgeType === 'live' ? 'var(--sev-low-bg)' : 'var(--surface-elevated)',
                              color: badgeType === 'live' ? 'var(--sev-low)' : 'var(--text-muted)',
                              borderColor: badgeType === 'live' ? 'var(--sev-low-border)' : 'var(--border)'
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Middle/Bottom Telemetry & Operator Section (Fills remaining height) */}
      {!collapsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          {/* Live Ingestion & Cluster Telemetry Widget */}
          <div className="sidebar-widget">
            <div className="sidebar-widget-header">
              <span className="sidebar-widget-title">Cluster Telemetry</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--sev-low)' }}>
                <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
                ACTIVE
              </span>
            </div>

            <div className="sidebar-widget-row">
              <span>Ingestion Rate</span>
              <span className="sidebar-widget-val">{epsRate.toLocaleString()} EPS</span>
            </div>

            <div className="sidebar-widget-row">
              <span>Collector Nodes</span>
              <span className="sidebar-widget-val">4 / 4 Online</span>
            </div>

            <div className="sidebar-widget-row">
              <span>Database Engine</span>
              <span className="sidebar-widget-val">MongoDB 7.0</span>
            </div>

            <div className="sidebar-widget-row">
              <span>Threat Level</span>
              <span className="sidebar-widget-val" style={{ color: 'var(--sev-high)' }}>ELEVATED</span>
            </div>
          </div>

          {/* Quick Simulation Lab Shortcut */}
          <div style={{ margin: '0 0.75rem' }}>
            <button
              onClick={() => onSelectTab('logs')}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                justifyContent: 'center',
                fontSize: '0.74rem',
                padding: '0.45rem',
                gap: '0.45rem'
              }}
              title="Launch attack simulator"
            >
              <Terminal size={13} style={{ color: 'var(--text-primary)' }} />
              <span>Attack Simulator Lab</span>
            </button>
          </div>

          {/* Operator Identity Badge */}
          <div className="sidebar-operator-card">
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              flexShrink: 0
            }}>
              <Cpu size={13} />
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'admin'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Lead SOC Admin' : 'Security Analyst'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Icon Bar Mode */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0' }}>
          <span className="status-dot status-dot-online" title="Ingestion: Active" style={{ width: '7px', height: '7px' }} />
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem' }}
            onClick={() => onSelectTab('logs')}
            title="Attack Simulator Lab"
          >
            <Terminal size={14} />
          </button>
        </div>
      )}

      {/* Collapse Toggle Footer */}
      <div className="sidebar-footer" style={collapsed ? { padding: '0.5rem 0.4rem' } : { padding: '0.5rem 0.75rem' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-end', padding: '0.35rem' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
