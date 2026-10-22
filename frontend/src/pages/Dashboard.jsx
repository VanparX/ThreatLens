import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flame,
  Terminal,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import api from '../api/client';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Compute composite posture score (0 - 100)
  const computePostureScore = () => {
    if (!stats) return 100;
    const critical = stats.alertsBySeverity?.CRITICAL || 0;
    const high = stats.alertsBySeverity?.HIGH || 0;
    const openIncidents = stats.openIncidents || 0;
    const penalty = (critical * 18) + (high * 9) + (openIncidents * 12);
    return Math.max(15, Math.min(100, 100 - penalty));
  };

  const postureScore = computePostureScore();
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--neon-emerald)';
    if (score >= 50) return 'var(--neon-amber)';
    return 'var(--neon-rose)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity color="var(--neon-cyan)" size={24} />
            <span>SOC Telemetry & Threat Posture</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time correlation of event logs, automated rule detection, and active incident response status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--neon-cyan)' }}
            />
            Auto-refresh (10s)
          </label>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{lastRefreshed ? `Refreshed ${lastRefreshed}` : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Ingested Security Logs */}
        <div className="soc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Ingested Logs
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {stats?.totalLogs?.toLocaleString() || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingUp size={12} />
              <span>{stats?.logsLast24h || 0} in last 24h</span>
            </div>
          </div>
          <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <Terminal size={24} color="var(--neon-cyan)" />
          </div>
        </div>

        {/* KPI 2: Detections */}
        <div className="soc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Threat Detections
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {stats?.totalDetections || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {stats?.openDetections || 0} open anomalies
            </div>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <ShieldAlert size={24} color="var(--neon-blue)" />
          </div>
        </div>

        {/* KPI 3: Open Alerts */}
        <div className="soc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Alerts
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stats?.openAlerts > 0 ? 'var(--neon-amber)' : 'var(--text-primary)', marginTop: '0.2rem' }}>
              {stats?.openAlerts || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {stats?.totalAlerts || 0} total lifecycle alerts
            </div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <AlertTriangle size={24} color="var(--neon-amber)" />
          </div>
        </div>

        {/* KPI 4: Active Incidents */}
        <div className="soc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Incidents
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stats?.openIncidents > 0 ? 'var(--neon-rose)' : 'var(--neon-emerald)', marginTop: '0.2rem' }}>
              {stats?.openIncidents || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {stats?.totalIncidents || 0} escalated cases
            </div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <Flame size={24} color="var(--neon-rose)" />
          </div>
        </div>
      </div>

      {/* Main Grid: Threat Posture Gauge & Severity Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Posture Score & Health Card */}
        <div className="soc-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Security Posture Score</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SIEM Composite Index</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '1rem 0' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="130" height="130" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--chart-track)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={getScoreColor(postureScore)}
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * postureScore) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: getScoreColor(postureScore) }}>
                  {postureScore}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>/100</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {postureScore >= 80 ? (
                  <ShieldCheck size={18} color="var(--neon-emerald)" />
                ) : (
                  <ShieldAlert size={18} color={getScoreColor(postureScore)} />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {postureScore >= 80 ? 'DEFENSE SECURE' : postureScore >= 50 ? 'ELEVATED RISK' : 'CRITICAL THREAT'}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Real-time composite calculated from unmitigated critical alerts and active incident containment playbooks.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Active Rules Correlating:</span>
            <strong style={{ color: 'var(--neon-cyan)' }}>{stats?.activeRules || 0} rules enabled</strong>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="soc-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Alert Severity Distribution</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Categorized Alerts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { level: 'CRITICAL', color: 'var(--neon-rose)', count: stats?.alertsBySeverity?.CRITICAL || 0 },
              { level: 'HIGH', color: 'var(--neon-amber)', count: stats?.alertsBySeverity?.HIGH || 0 },
              { level: 'MEDIUM', color: 'var(--neon-blue)', count: stats?.alertsBySeverity?.MEDIUM || 0 },
              { level: 'LOW', color: 'var(--neon-emerald)', count: stats?.alertsBySeverity?.LOW || 0 }
            ].map((item) => {
              const maxCount = Math.max(1, (stats?.totalAlerts || 1));
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, color: item.color }}>{item.level}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.count} alerts ({pct}%)</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--progress-track)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="soc-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Recent SOC Escalations</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest threats flagged by the detection engine</p>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <span>View All Alerts</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {(!stats?.recentAlerts || stats.recentAlerts.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <ShieldCheck size={36} color="var(--neon-emerald)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.8 }} />
            <p>No recent alerts triggered. All network assets within normal baselines.</p>
            <button
              onClick={() => onNavigate('logs')}
              className="btn btn-primary"
              style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}
            >
              Go to Simulator to Ingest Attack Logs
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Title</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Severity</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Time</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAlerts.map((alert, idx) => (
                  <tr key={alert.id || idx} style={{ borderBottom: '1px solid var(--border-color-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {alert.title}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span className={`badge badge-${(alert.severity || 'low').toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)' }}>
                      {alert.status}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Just now'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate('alerts')}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      >
                        Triage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
