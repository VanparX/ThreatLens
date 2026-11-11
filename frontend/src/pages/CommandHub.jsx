import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Terminal,
  AlertTriangle,
  Flame,
  Sliders,
  Mail,
  FileText,
  ArrowRight,
  Activity,
  CheckCircle2,
  Server,
  Clock,
  ExternalLink,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatIST } from '../utils/dateUtils';

export default function CommandHub({ onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = (target) => {
    if (typeof onNavigate === 'function') {
      try { onNavigate(target); } catch (_) {}
    }
    const pathMap = {
      dashboard: '/dashboard',
      logs: '/logs',
      detections: '/detections',
      alerts: '/alerts',
      incidents: '/incidents',
      rules: '/rules',
      notifications: '/notifications',
      audit: '/audit',
      'command-hub': '/command-hub',
    };
    navigate(pathMap[target] || target);
  };
  const [stats, setStats] = useState({
    openAlerts: 0,
    openIncidents: 0,
    openDetections: 0,
    totalLogs: 0,
    logsLast24h: 0,
    activeRules: 0,
    postureScore: null
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatIST(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadOverviewData = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (!mounted) return;
        const d = res?.data ?? res;

        const crit = d?.alertsBySeverity?.CRITICAL || 0;
        const high = d?.alertsBySeverity?.HIGH || 0;
        const inc = d?.openIncidents || 0;
        const penalty = (crit * 16) + (high * 6) + (inc * 12);
        const derivedScore = Math.max(0, Math.min(100, 100 - penalty));

        setStats({
          openAlerts: d?.openAlerts ?? 0,
          openIncidents: d?.openIncidents ?? 0,
          openDetections: d?.openDetections ?? 0,
          totalLogs: d?.totalLogs ?? 0,
          logsLast24h: d?.logsLast24h ?? 0,
          activeRules: d?.activeRules ?? 0,
          postureScore: derivedScore
        });
      } catch (err) {
        console.error('Failed to load Command Hub statistics:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOverviewData();
    return () => { mounted = false; };
  }, []);

  const modules = [
    {
      id: 'dashboard',
      title: 'Security Operations Overview',
      description: 'Comprehensive posture analytics, telemetry ingestion velocity, detection severity breakdowns, and threat meters.',
      icon: LayoutDashboard,
      badge: 'Live Analytics',
      badgeClass: 'badge-low',
      actionText: 'Open Overview'
    },
    {
      id: 'logs',
      title: 'Security Log Explorer & Simulator',
      description: 'Search structured event logs, inspect raw security envelopes, and execute controlled attack simulation scenarios.',
      icon: Terminal,
      badge: 'Ingestion Active',
      badgeClass: 'badge-low',
      actionText: 'Launch Log Stream'
    },
    {
      id: 'detections',
      title: 'Threat Detection Engine & Heuristics',
      description: 'Behavioral rule match evaluations, deterministic risk scoring formula breakdowns, and triggering telemetry inspection.',
      icon: Activity,
      badge: stats.openDetections > 0 ? `${stats.openDetections} Active` : 'All Clear',
      badgeClass: stats.openDetections > 0 ? 'badge-high' : 'badge-low',
      actionText: 'Inspect Detections'
    },
    {
      id: 'alerts',
      title: 'Alert Triage & Detection Center',
      description: 'Prioritized event detections flagged by behavioral rules with severity-weighted scoring and analyst assignment.',
      icon: AlertTriangle,
      badge: stats.openAlerts > 0 ? `${stats.openAlerts} Active` : 'All Clear',
      badgeClass: stats.openAlerts > 0 ? 'badge-high' : 'badge-low',
      actionText: 'Triage Alerts'
    },
    {
      id: 'incidents',
      title: 'SOAR Incident Containment',
      description: 'Active incident containment workflows: isolate malicious IPs, lock compromised identities, and track mitigation lifecycle.',
      icon: Flame,
      badge: stats.openIncidents > 0 ? `${stats.openIncidents} Open` : 'Nominal',
      badgeClass: stats.openIncidents > 0 ? 'badge-critical' : 'badge-low',
      actionText: 'Manage Cases'
    },
    {
      id: 'rules',
      title: 'Correlation & Detection Rules',
      description: 'Configure frequency-threshold correlation rules, sliding time evaluation windows, and MITRE ATT&CK taxonomy alignments.',
      icon: Sliders,
      badge: `${stats.activeRules} Armed`,
      badgeClass: 'badge-medium',
      actionText: 'Configure Rules'
    },
    {
      id: 'notifications',
      title: 'Notification & Dispatch Channels',
      description: 'Configure automated outbound email security advisories, emergency SMS delivery, and verify dispatch health.',
      icon: Mail,
      badge: 'Multi-Channel',
      badgeClass: 'badge-medium',
      actionText: 'Channel Settings'
    },
    {
      id: 'audit',
      title: 'System Audit Trail',
      description: 'Immutable, chronological log recording analyst triage decisions, rule modifications, and automated containment actions.',
      icon: FileText,
      badge: 'Append Only',
      badgeClass: 'badge-low',
      actionText: 'Inspect Trail'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Enterprise Executive Landing Header */}
      <div className="panel" style={{ padding: '1.5rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, var(--border) 0%, var(--border-focus) 50%, var(--border) 100%)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-low" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
                OPERATIONAL SESSION
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enclave: Production Cluster
              </span>
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back, {user?.username || 'Security Analyst'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
              ThreatLens Security Information and Event Management (SIEM) Command Hub. Review real-time environment posture or access specialized investigative workspaces below.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Clock size={13} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{currentTime || 'Synchronizing…'}</span>
            </div>

            <button
              onClick={() => handleNavigate('dashboard')}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem', gap: '0.5rem' }}
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary Strip */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Security Posture Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span
              className="kpi-value"
              style={{
                color: (stats.postureScore ?? 100) >= 80
                  ? 'var(--status-online)'
                  : (stats.postureScore ?? 100) >= 50
                    ? 'var(--sev-high)'
                    : 'var(--sev-critical)'
              }}
            >
              {loading ? '–' : (stats.postureScore ?? 100)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
            <span
              className={`badge ${(stats.postureScore ?? 100) >= 80 ? 'badge-low' : (stats.postureScore ?? 100) >= 50 ? 'badge-high' : 'badge-critical'}`}
              style={{ marginLeft: 'auto', fontSize: '0.65rem' }}
            >
              {loading ? '–' : (stats.postureScore ?? 100) >= 80 ? 'DEFCON 5' : (stats.postureScore ?? 100) >= 50 ? 'DEFCON 3' : 'DEFCON 2'}
            </span>
          </div>
          <div className="kpi-meta">Frontend heuristic score (derived from active threats)</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Ingested Security Events</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">
              {loading ? '–' : Number(stats.totalLogs || 0).toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>events</span>
            <span className="badge badge-low" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              DB LIVE
            </span>
          </div>
          <div className="kpi-meta">
            {loading ? '–' : `${Number(stats.logsLast24h || 0).toLocaleString()} events ingested in last 24h`}
          </div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active Threat Alerts</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: stats.openAlerts > 0 ? 'var(--sev-high)' : 'var(--status-online)' }}>
              {loading ? '–' : stats.openAlerts}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>unresolved</span>
            <button
              onClick={() => handleNavigate('alerts')}
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-secondary)' }}
            >
              Review →
            </button>
          </div>
          <div className="kpi-meta">Open, acknowledged &amp; assigned alerts</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Open Incident Cases</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: stats.openIncidents > 0 ? 'var(--sev-critical)' : 'var(--text-primary)' }}>
              {loading ? '–' : stats.openIncidents}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cases</span>
            <button
              onClick={() => handleNavigate('incidents')}
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-secondary)' }}
            >
              Contain →
            </button>
          </div>
          <div className="kpi-meta">Active investigation &amp; containment cases</div>
        </div>
      </div>

      {/* Operational Workspaces Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Specialized Operations Workspaces
            </h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Direct access into SIEM telemetry inspection, behavioral rule tuning, active containment, and notification delivery.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '0.85rem'
        }}>
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => handleNavigate(mod.id)}
                className="launch-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1.1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)'
                    }}>
                      <Icon size={17} />
                    </div>

                    <span className={`badge ${mod.badgeClass}`} style={{ fontSize: '0.67rem' }}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {mod.title}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    {mod.description}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <span>{mod.actionText}</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
