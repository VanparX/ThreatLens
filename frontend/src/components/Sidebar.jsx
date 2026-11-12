import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ScrollText,
  Crosshair,
  AlertTriangle,
  Flame,
  Sliders,
  Users,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Cpu,
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MiniCyberDefenseCore from './MiniCyberDefenseCore';

const NAV_GROUPS = [
  {
    title: 'OPERATIONS',
    items: [
      { path: '/command-hub', id: 'hub',       label: 'Command Hub',       icon: Shield,          badge: 'Portal' },
      { path: '/dashboard',   id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard },
      { path: '/logs',        id: 'logs',      label: 'Security Logs',     icon: ScrollText,      badge: 'Live', badgeType: 'live', colSpan: 2 },
    ]
  },
  {
    title: 'THREAT INTELLIGENCE',
    items: [
      { path: '/detections',  id: 'detections', label: 'Detections',        icon: Crosshair,       badge: 'Live', badgeType: 'live' },
      { path: '/alerts',      id: 'alerts',     label: 'Alert Center',      icon: AlertTriangle },
      { path: '/incidents',   id: 'incidents',  label: 'Incident Response', icon: Flame,           badge: 'SOAR' },
      { path: '/rules',       id: 'rules',      label: 'Detection Rules',   icon: Sliders,         badge: 'Active' },
    ]
  },
  {
    title: 'GOVERNANCE',
    items: [
      { path: '/users',         id: 'users',         label: 'User Management',       icon: Users,    adminOnly: true },
      { path: '/audit',         id: 'audit',         label: 'Audit Logs',            icon: FileText, adminOnly: true },
      { path: '/notifications', id: 'notifications', label: 'Notification Settings', icon: Bell,     colSpan: 2 },
    ]
  }
];

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) {
  const { user, isAdmin, isAnalyst } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleTitle = isAdmin ? 'Lead SOC Admin' : (isAnalyst ? 'Security Analyst' : 'Security Viewer');

  const handleNavClick = (path) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`.trim()}
        aria-label="SOC Navigation"
      >
        {/* Mobile Header (visible only on narrow viewports when open) */}
        {mobileOpen && (
          <div className="sidebar-mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="topbar-brand-icon">
                <Shield size={14} style={{ color: 'var(--tl-accent-primary)' }} />
              </span>
              <span style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                ThreatLens SOC
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <div className="sidebar-nav-scroll" style={{ flex: '0 1 auto', overflowY: 'auto', overflowX: 'hidden' }}>
          <nav style={{ padding: '0.35rem 0' }}>
            {!collapsed ? (
              /* Expanded Two-Column Tile Grid Layout */
              NAV_GROUPS.map((group, gIdx) => (
                <div key={gIdx} style={{ marginBottom: '0.65rem' }}>
                  <div className="sidebar-section-label">
                    {group.title}
                  </div>
                  <div className="nav-tile-grid">
                    {group.items.map(({ path, label, icon: Icon, badge, badgeType, adminOnly, colSpan }) => {
                      const isActive = location.pathname === path;

                      return (
                        <button
                          key={path}
                          type="button"
                          className={`nav-tile ${isActive ? 'active' : ''} ${colSpan === 2 ? 'col-span-2' : ''}`.trim()}
                          onClick={() => handleNavClick(path)}
                          title={adminOnly && !isAdmin ? `${label} (Admin Required)` : label}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={label}
                        >
                          {/* Corner Indicator Badges */}
                          {adminOnly && !isAdmin ? (
                            <span className="nav-tile-badge badge-admin" title="Admin Required">
                              <Lock size={8} />
                            </span>
                          ) : badge ? (
                            <span className={`nav-tile-badge badge-${badgeType === 'live' ? 'live' : 'neutral'}`}>
                              {badge}
                            </span>
                          ) : null}

                          <Icon
                            size={16}
                            className="nav-tile-icon"
                            style={{
                              color: isActive ? 'var(--tl-accent-primary)' : 'var(--tl-text-secondary)',
                              opacity: isActive ? 1 : 0.85
                            }}
                          />

                          <span className="nav-label nav-tile-label">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Collapsed Single Column Icon Rail */
              <div className="nav-collapsed-grid">
                {NAV_GROUPS.flatMap(g => g.items).map(({ path, label, icon: Icon, adminOnly }) => {
                  const isActive = location.pathname === path;

                  return (
                    <button
                      key={path}
                      type="button"
                      className={`nav-collapsed-item ${isActive ? 'active' : ''}`.trim()}
                      onClick={() => handleNavClick(path)}
                      title={adminOnly && !isAdmin ? `${label} (Admin Required)` : label}
                      aria-label={label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isActive ? 'var(--tl-accent-primary)' : 'var(--tl-text-secondary)',
                          opacity: isActive ? 1 : 0.85
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Telemetry Lab Quick Launch + Operator Badge */}
        {!collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
            {/* Attack Simulation Shortcut */}
            <div style={{ margin: '0 0.75rem' }}>
              <button
                type="button"
                onClick={() => handleNavClick('/logs')}
                className="btn btn-secondary btn-sm"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '0.74rem',
                  padding: '0.45rem',
                  gap: '0.45rem'
                }}
                title="Launch attack simulator lab in Security Logs"
              >
                <Terminal size={13} style={{ color: 'var(--tl-text-primary)' }} />
                <span>Attack Simulator Lab</span>
              </button>
            </div>

            {/* Operator Card */}
            <div className="sidebar-operator-card">
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--tl-text-primary)',
                  flexShrink: 0
                }}
              >
                <Cpu size={13} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--tl-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user?.username || 'admin'}
                </div>
                <div style={{ fontSize: '0.65rem', color: isAdmin ? 'var(--tl-sev-high)' : 'var(--tl-text-muted)' }}>
                  {roleTitle}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Icons Only */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => handleNavClick('/logs')}
              title="Attack Simulator Lab (Security Logs)"
              aria-label="Attack Simulator Lab"
            >
              <Terminal size={14} />
            </button>
          </div>
        )}

        {/* Flexible Spacer (anchors Mini Cyber Defense Core to bottom) */}
        <div className="sidebar-spacer" style={{ flex: '1 1 auto', minHeight: '0.75rem' }} />

        {/* Mini Cyber Defense Core Animation (Hidden in mobile drawer) */}
        {!mobileOpen && (
          <div className="sidebar-defense-container" style={{ flexShrink: 0 }}>
            <MiniCyberDefenseCore collapsed={collapsed} />
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <div
            className="sidebar-footer"
            style={collapsed ? { padding: '0.4rem 0.3rem', alignItems: 'center' } : { padding: '0.5rem 0.75rem' }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-end',
                padding: '0.35rem 0.5rem'
              }}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
