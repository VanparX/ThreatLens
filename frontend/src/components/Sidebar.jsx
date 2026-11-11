import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Terminal,
  Cpu,
  Lock,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: 'OPERATIONS',
    items: [
      { path: '/command-hub', id: 'hub',       label: 'Command Hub',       icon: Shield,          badge: 'Portal' },
      { path: '/dashboard',   id: 'dashboard', label: 'Security Overview', icon: LayoutDashboard },
      { path: '/logs',        id: 'logs',      label: 'Security Logs',     icon: ScrollText,      badge: 'Live', badgeType: 'live' },
    ]
  },
  {
    title: 'THREAT INTELLIGENCE & SOAR',
    items: [
      { path: '/detections',  id: 'detections', label: 'Threat Detections', icon: Activity, badge: 'Live', badgeType: 'live' },
      { path: '/alerts',      id: 'alerts',     label: 'Detections & Alerts', icon: AlertTriangle },
      { path: '/incidents',   id: 'incidents',  label: 'Incident Response',   icon: Flame,         badge: 'SOAR' },
      { path: '/rules',       id: 'rules',      label: 'Detection Rules',     icon: Sliders,       badge: 'Active' },
    ]
  },
  {
    title: 'GOVERNANCE & CHANNELS',
    items: [
      { path: '/notifications', id: 'notifications', label: 'Notifications',  icon: Bell },
      { path: '/users',         id: 'users',         label: 'User Management', icon: Users,    adminOnly: true },
      { path: '/audit',         id: 'audit',         label: 'Audit Trail',    icon: FileText, adminOnly: true },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, isAnalyst } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleTitle = isAdmin ? 'Lead SOC Admin' : (isAnalyst ? 'Security Analyst' : 'Security Viewer');

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

              {section.items.map(({ path, label, icon: Icon, badge, badgeType, adminOnly }) => {
                const isActive = location.pathname === path;
                return (
                  <button
                    key={path}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    onClick={() => navigate(path)}
                    title={collapsed ? (adminOnly ? `${label} (Admin Only)` : label) : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    style={{ padding: '0.45rem 0.85rem' }}
                  >
                    <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                    {!collapsed && (
                      <>
                        <span className="nav-label" style={{ fontSize: '0.82rem', flex: 1, textAlign: 'left' }}>
                          {label}
                        </span>
                        {adminOnly && !isAdmin && (
                          <span
                            className="nav-badge"
                            style={{
                              background: 'var(--surface-elevated)',
                              color: 'var(--sev-high)',
                              borderColor: 'var(--sev-high-border)',
                              fontSize: '0.6rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Admin Clearance Required"
                          >
                            <Lock size={9} /> Admin
                          </span>
                        )}
                        {badge && (!adminOnly || isAdmin) && (
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

      {/* Middle/Bottom Telemetry & Operator Section */}
      {!collapsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          {/* Quick Simulation Lab Shortcut */}
          <div style={{ margin: '0 0.75rem' }}>
            <button
              onClick={() => navigate('/logs')}
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
              <div style={{ fontSize: '0.65rem', color: isAdmin ? 'var(--sev-high)' : 'var(--text-muted)' }}>
                {roleTitle}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Icon Bar Mode */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem' }}
            onClick={() => navigate('/logs')}
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
