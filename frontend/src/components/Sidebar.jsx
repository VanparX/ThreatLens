import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';

const NAV = [
  { id: 'hub',           label: 'Command Hub',       icon: Shield },
  { id: 'dashboard',     label: 'Security Overview', icon: LayoutDashboard },
  { id: 'logs',          label: 'Security Logs',     icon: ScrollText, badge: 'Live' },
  { id: 'alerts',        label: 'Detections & Alerts', icon: AlertTriangle },
  { id: 'incidents',     label: 'Incident Response', icon: Flame },
  { id: 'rules',         label: 'Detection Rules',   icon: Sliders },
  { id: 'notifications', label: 'Notifications',     icon: Bell },
  { id: 'audit',         label: 'Audit Trail',       icon: FileText },
];

export default function Sidebar({ activeTab, onSelectTab }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
      <nav style={{ flex: 1 }}>
        {!collapsed && (
          <div className="sidebar-section-label">Navigation</div>
        )}

        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => onSelectTab(id)}
              title={collapsed ? label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
              {!collapsed && (
                <>
                  <span className="nav-label">{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="sidebar-footer" style={collapsed ? { padding: '0.5rem 0.6rem' } : {}}>
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
