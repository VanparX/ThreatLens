import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ArrowRight, ShieldCheck, ShieldAlert,
  AlertTriangle, Flame, ScrollText, Sliders
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import api from '../api/client';

/* ---- helpers ---- */
function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : '–'; }

function fmtTime(iso) {
  if (!iso) return '–';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch { return iso; }
}

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SEV_COLOR = {
  CRITICAL: 'var(--sev-critical)',
  HIGH:     'var(--sev-high)',
  MEDIUM:   'var(--sev-medium)',
  LOW:      'var(--sev-low)',
};

/* ---- Custom chart tooltip ---- */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.75rem'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ---- Skeleton ---- */
function Skeleton({ w = '100%', h = '1.1rem', r = 'var(--radius-md)', style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/* ---- KPI Cell ---- */
function KpiCell({ label, value, sub, colorClass, loading, onClick }) {
  return (
    <div className={`kpi-cell${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}>
      <div className="kpi-label">{label}</div>
      {loading
        ? <Skeleton h="1.6rem" style={{ marginTop: '0.2rem', marginBottom: '0.15rem' }} />
        : <div className={`kpi-value${colorClass ? ' ' + colorClass : ''}`}>{value}</div>
      }
      {sub && !loading && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats');
      // res is already the data (axios interceptor unwraps .data)
      setStats(res?.data ?? res);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard stats failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetch]);

  // Posture score — derived from real data, explained to user
  const postureScore = (() => {
    if (!stats || loading) return null;
    const crit  = stats.alertsBySeverity?.CRITICAL || 0;
    const high  = stats.alertsBySeverity?.HIGH     || 0;
    const inc   = stats.openIncidents || 0;
    const penalty = (crit * 18) + (high * 8) + (inc * 10);
    return Math.max(0, Math.min(100, 100 - penalty));
  })();

  // Severity distribution for chart
  const sevData = SEV_ORDER.map(sev => ({
    name: sev.charAt(0) + sev.slice(1).toLowerCase(),
    count: stats?.alertsBySeverity?.[sev] ?? 0,
    color: SEV_COLOR[sev],
  }));
  const maxSev = Math.max(1, ...sevData.map(d => d.count));

  // Recent alerts
  const recentAlerts = stats?.recentAlerts ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">Security event monitoring, detection activity, and incident status.</p>
        </div>
        <div className="page-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.764rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--text-primary)', width: '13px', height: '13px' }}
            />
            Auto-refresh
          </label>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetch}
            disabled={loading}
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            {lastRefresh ? `${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <KpiCell
          label="Security Events"
          value={loading ? '' : fmt(stats?.totalLogs)}
          sub={loading ? '' : `${fmt(stats?.logsLast24h ?? 0)} last 24 h`}
          loading={loading}
          onClick={() => onNavigate('logs')}
        />
        <KpiCell
          label="Threat Detections"
          value={loading ? '' : fmt(stats?.totalDetections)}
          sub={loading ? '' : `${fmt(stats?.openDetections ?? 0)} open`}
          loading={loading}
          onClick={() => onNavigate('alerts')}
        />
        <KpiCell
          label="Open Alerts"
          value={loading ? '' : fmt(stats?.openAlerts)}
          sub={loading ? '' : `${fmt(stats?.totalAlerts ?? 0)} total`}
          colorClass={stats?.openAlerts > 0 ? 'warning' : ''}
          loading={loading}
          onClick={() => onNavigate('alerts')}
        />
        <KpiCell
          label="Critical Alerts"
          value={loading ? '' : fmt(stats?.alertsBySeverity?.CRITICAL ?? 0)}
          sub="Require immediate review"
          colorClass={stats?.alertsBySeverity?.CRITICAL > 0 ? 'critical' : ''}
          loading={loading}
          onClick={() => onNavigate('alerts')}
        />
        <KpiCell
          label="Open Incidents"
          value={loading ? '' : fmt(stats?.openIncidents)}
          sub={loading ? '' : `${fmt(stats?.totalIncidents ?? 0)} total`}
          colorClass={stats?.openIncidents > 0 ? 'critical' : 'healthy'}
          loading={loading}
          onClick={() => onNavigate('incidents')}
        />
        <KpiCell
          label="Active Rules"
          value={loading ? '' : fmt(stats?.activeRules)}
          sub="Detection rules enabled"
          colorClass="accent"
          loading={loading}
          onClick={() => onNavigate('rules')}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', alignItems: 'start' }}>
        {/* Severity distribution bar chart */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>Alert Severity Distribution</span>
            <span style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>by count</span>
          </div>
          <div className="chart-body" style={{ height: '180px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.5rem' }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} h="28px" />)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Alerts" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {sevData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Posture score panel */}
        <div className="chart-panel" style={{ height: '100%' }}>
          <div className="chart-panel-header">
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>Posture Score</span>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loading ? (
              <>
                <Skeleton h="60px" />
                <Skeleton h="40px" />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem' }}>
                  <span style={{
                    fontSize: '2.8rem', fontWeight: 700, lineHeight: 1,
                    color: postureScore >= 80 ? 'var(--sev-low)' : postureScore >= 50 ? 'var(--sev-high)' : 'var(--sev-critical)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {postureScore ?? '–'}
                  </span>
                  <span style={{ fontSize: '0.857rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>/100</span>
                </div>

                <div style={{ height: '6px', background: 'var(--chart-track)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${postureScore ?? 0}%`, height: '100%', borderRadius: '4px',
                    background: postureScore >= 80 ? 'var(--sev-low)' : postureScore >= 50 ? 'var(--sev-high)' : 'var(--sev-critical)',
                    transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
                  }} />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {postureScore >= 80
                    ? 'No active critical threats.'
                    : 'Score decreases per unresolved critical alert (−18) and open incident (−10).'}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {postureScore >= 80
                    ? <ShieldCheck size={14} style={{ color: 'var(--sev-low)' }} />
                    : <ShieldAlert size={14} style={{ color: 'var(--sev-critical)' }} />}
                  <span style={{ fontSize: '0.764rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {postureScore >= 80 ? 'Baseline secure' : postureScore >= 50 ? 'Elevated risk' : 'Critical threat'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Alerts</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('alerts')}>
            All alerts <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} h="36px" />)}
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={36} style={{ color: 'var(--sev-low)', opacity: 0.7 }} />
            <div className="empty-state-title">No recent alerts</div>
            <div className="empty-state-text">
              No detections have been triggered. Use the Security Logs simulator to generate test events.
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => onNavigate('logs')}>
              Open Log Simulator
            </button>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th style={{ width: '70px' }} />
                </tr>
              </thead>
              <tbody>
                {recentAlerts.slice(0, 8).map((a, idx) => (
                  <tr key={a.id ?? idx}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '320px' }}>
                      <span title={a.title} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${(a.severity || 'low').toLowerCase()}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${(a.status || '').toLowerCase()}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="col-mono col-dim">{fmtTime(a.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => onNavigate('alerts')}>
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
