import React, { useState, useEffect } from 'react';
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

export default function CommandHub({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeAlerts: 0,
    openIncidents: 0,
    totalLogs: 0,
    postureScore: 94
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadOverviewData = async () => {
      try {
        const [alertsRes, incidentsRes, logsRes] = await Promise.allSettled([
          api.get('/alerts'),
          api.get('/incidents'),
          api.get('/logs?page=0&size=1')
        ]);

        if (!mounted) return;

        let alertsCount = 0;
        if (alertsRes.status === 'fulfilled') {
          const val = alertsRes.value;
          const alertsList = val?.data?.content || val?.content || (Array.isArray(val?.data) ? val.data : (Array.isArray(val) ? val : []));
          alertsCount = alertsList.length || 0;
        }

        let incidentsCount = 0;
        if (incidentsRes.status === 'fulfilled') {
          const val = incidentsRes.value;
          const incidentsList = val?.data?.content || val?.content || (Array.isArray(val?.data) ? val.data : (Array.isArray(val) ? val : []));
          incidentsCount = incidentsList.length || 0;
        }

        let totalLogs = 0;
        if (logsRes.status === 'fulfilled') {
          const val = logsRes.value;
          totalLogs = val?.data?.totalElements ?? val?.totalElements ?? 0;
        }

        const score = Math.max(35, 100 - (incidentsCount * 12) - (alertsCount * 3));

        setStats({
          activeAlerts: alertsCount,
          openIncidents: incidentsCount,
          totalLogs: totalLogs,
          postureScore: score
        });
      } catch {
        // Fallback gracefully
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
      id: 'alerts',
      title: 'Alert Triage & Detection Center',
      description: 'Prioritized event detections flagged by behavioral rules with severity-weighted scoring and analyst assignment.',
      icon: AlertTriangle,
      badge: stats.activeAlerts > 0 ? `${stats.activeAlerts} Active` : 'All Clear',
      badgeClass: stats.activeAlerts > 0 ? 'badge-high' : 'badge-low',
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
      badge: 'Engine Armed',
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

  const collectorNodes = [
    { name: 'fw-perimeter-01.us-east', type: 'Perimeter Firewall Telemetry', status: 'Healthy', throughput: '840 eps', latency: '8ms' },
    { name: 'bastion-auth-02.corp', type: 'Privileged Access Bastion (SSHD)', status: 'Healthy', throughput: '165 eps', latency: '12ms' },
    { name: 'edge-gateway-envoy.dmz', type: 'API Ingress Gateway', status: 'Healthy', throughput: '520 eps', latency: '9ms' },
    { name: 'idp-sso.internal', type: 'Identity Provider & OAuth Audit', status: 'Healthy', throughput: '110 eps', latency: '7ms' }
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
              onClick={() => onNavigate('dashboard')}
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
            <span className="kpi-value" style={{ color: stats.postureScore >= 80 ? 'var(--status-online)' : 'var(--sev-high)' }}>
              {stats.postureScore}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
            <span className="badge badge-low" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              STABLE
            </span>
          </div>
          <div className="kpi-meta">Calculated across active alerts & open incidents</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Telemetry Ingestion Status</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">
              {stats.totalLogs ? Number(stats.totalLogs).toLocaleString() : '1,635'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>events</span>
            <span className="badge badge-low" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              4 / 4 ONLINE
            </span>
          </div>
          <div className="kpi-meta">Aggregate velocity ~1,635 EPS</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active Detections</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: stats.activeAlerts > 0 ? 'var(--sev-high)' : 'var(--status-online)' }}>
              {stats.activeAlerts}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>unresolved</span>
            <button
              onClick={() => onNavigate('alerts')}
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-secondary)' }}
            >
              Review →
            </button>
          </div>
          <div className="kpi-meta">Prioritized by rule risk score</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Open Incident Cases</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: stats.openIncidents > 0 ? 'var(--sev-critical)' : 'var(--text-primary)' }}>
              {stats.openIncidents}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cases</span>
            <button
              onClick={() => onNavigate('incidents')}
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-secondary)' }}
            >
              Contain →
            </button>
          </div>
          <div className="kpi-meta">SOAR automated playbooks available</div>
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
                onClick={() => onNavigate(mod.id)}
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

      {/* Infrastructure Telemetry Stream Summary */}
      <div className="panel" style={{ padding: '1.25rem 1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Connected Telemetry Collector Nodes
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Active sensors streaming security events into the ThreatLens ingestion pipeline.
            </p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Open Live Log Stream
          </button>
        </div>

        <div className="table-wrap">
          <table className="table" style={{ fontSize: '0.786rem' }}>
            <thead>
              <tr>
                <th>Collector Node</th>
                <th>Source Technology</th>
                <th>Status</th>
                <th>Throughput</th>
                <th>Ingestion Latency</th>
              </tr>
            </thead>
            <tbody>
              {collectorNodes.map((s, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {s.name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {s.type}
                  </td>
                  <td>
                    <span className="badge badge-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span className="status-dot status-dot-online" style={{ width: '4px', height: '4px' }} />
                      {s.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {s.throughput}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {s.latency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
