import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, ArrowRight, ShieldCheck, ShieldAlert,
  AlertTriangle, Flame, ScrollText, Sliders, Zap,
  Play, Pause, Radio, Terminal, CheckCircle2, AlertOctagon, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import api from '../api/client';
import { injectNormalEvent, injectAttack } from '../utils/telemetryService';

/* ---- helpers ---- */
function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : '–'; }

function fmtTime(iso) {
  if (!iso) return '–';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
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
      borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.75rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {p.name}: <strong>{p.value}</strong>
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

  // Real-time telemetry generator state
  const [isStreaming, setIsStreaming] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [activeSimulation, setActiveSimulation] = useState(null);
  const streamTimerRef = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
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
    const iv = setInterval(fetch, 6000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetch]);

  // Live Telemetry Streamer loop
  useEffect(() => {
    if (isStreaming) {
      streamTimerRef.current = setInterval(async () => {
        try {
          await injectNormalEvent();
          // Periodically update dashboard
          fetch();
        } catch (e) {
          console.error('Streaming event failed:', e);
        }
      }, 3500);
    } else {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    }
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isStreaming, fetch]);

  // Attack injector action
  const handleInjectAttack = async (type) => {
    setActiveSimulation(type);
    setSimStatus({ loading: true, message: `Injecting ${type} telemetry into ingestion pipeline...` });
    try {
      const result = await injectAttack(type);
      setSimStatus({
        success: true,
        title: result.title,
        message: result.message,
        severity: result.severity,
        time: new Date().toLocaleTimeString()
      });
      // Refresh dashboard immediately
      setTimeout(() => fetch(), 600);
    } catch (err) {
      setSimStatus({
        success: false,
        title: 'Injection Error',
        message: err.message || 'Failed to ingest attack log',
        time: new Date().toLocaleTimeString()
      });
    } finally {
      setActiveSimulation(null);
    }
  };

  // Posture score — derived from real backend data
  const postureScore = (() => {
    if (!stats || loading) return null;
    const crit  = stats.alertsBySeverity?.CRITICAL || 0;
    const high  = stats.alertsBySeverity?.HIGH     || 0;
    const inc   = stats.openIncidents || 0;
    const penalty = (crit * 16) + (high * 6) + (inc * 12);
    return Math.max(0, Math.min(100, 100 - penalty));
  })();

  // Severity distribution for chart
  const sevData = SEV_ORDER.map(sev => ({
    name: sev.charAt(0) + sev.slice(1).toLowerCase(),
    severity: sev,
    count: stats?.alertsBySeverity?.[sev] ?? 0,
    color: SEV_COLOR[sev],
  }));
  const totalAlertCount = sevData.reduce((acc, d) => acc + d.count, 0);

  // Recent alerts from backend
  const recentAlerts = stats?.recentAlerts ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">Real-time enterprise threat monitoring, SIEM detection engine, and defense posture.</p>
        </div>
        <div className="page-actions" style={{ gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.764rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--text-primary)', width: '13px', height: '13px' }}
            />
            Auto-refresh (6s)
          </label>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetch}
            disabled={loading}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            {lastRefresh ? `${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry Generator & Attack Simulator Console */}
      <div style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
              background: isStreaming ? 'rgba(34, 197, 94, 0.12)' : 'var(--surface-elevated)',
              border: `1px solid ${isStreaming ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isStreaming ? 'var(--sev-low)' : 'var(--text-secondary)'
            }}>
              <Activity size={15} className={isStreaming ? 'pulse-fast' : ''} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Live Telemetry Generator & Attack Lab
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '3px',
                  background: isStreaming ? 'rgba(34, 197, 94, 0.15)' : 'var(--surface-elevated)',
                  color: isStreaming ? 'var(--sev-low)' : 'var(--text-muted)',
                  border: `1px solid ${isStreaming ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`
                }}>
                  {isStreaming ? 'INGESTING REAL-TIME LOGS (1 / 3.5s)' : 'STREAM PAUSED'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Sends authentic enterprise logs into Spring Boot & MongoDB to trigger detection rules and generate live alerts.
              </div>
            </div>
          </div>

          {/* Stream Toggle */}
          <button
            className={`btn btn-sm ${isStreaming ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setIsStreaming(!isStreaming)}
            style={{ minWidth: '135px', justifyContent: 'center' }}
          >
            {isStreaming ? (
              <>
                <Pause size={13} /> Pause Stream
              </>
            ) : (
              <>
                <Play size={13} /> Start Live Stream
              </>
            )}
          </button>
        </div>

        {/* One-Click Attack Triggers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.65rem'
        }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleInjectAttack('BRUTE_FORCE')}
            disabled={activeSimulation !== null}
            style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.45rem' }}
          >
            <Zap size={13} style={{ color: 'var(--sev-high)' }} />
            <span>⚡ SSH Brute Force (5×)</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleInjectAttack('RANSOMWARE')}
            disabled={activeSimulation !== null}
            style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.45rem' }}
          >
            <AlertOctagon size={13} style={{ color: 'var(--sev-critical)' }} />
            <span>⚡ Ransomware Outbreak</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleInjectAttack('PORT_SCAN')}
            disabled={activeSimulation !== null}
            style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.45rem' }}
          >
            <Radio size={13} style={{ color: 'var(--sev-medium)' }} />
            <span>⚡ Port Scan Sweep</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleInjectAttack('PRIV_ESC')}
            disabled={activeSimulation !== null}
            style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.45rem' }}
          >
            <ShieldAlert size={13} style={{ color: 'var(--sev-high)' }} />
            <span>⚡ Privilege Escalation</span>
          </button>
        </div>

        {/* Real-time simulation feedback toast */}
        {simStatus && (
          <div style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.73rem',
            background: simStatus.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${simStatus.success ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: simStatus.success ? 'var(--sev-low)' : 'var(--sev-critical)' }}>
              {simStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span><strong>{simStatus.title}:</strong> {simStatus.message}</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {simStatus.time}
            </span>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <KpiCell
          label="Security Events"
          value={loading ? '' : fmt(stats?.totalLogs)}
          sub={loading ? '' : `${fmt(stats?.logsLast24h ?? 0)} in last 24h`}
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
          sub={loading ? '' : `${fmt(stats?.totalAlerts ?? 0)} total generated`}
          colorClass={stats?.openAlerts > 0 ? 'warning' : ''}
          loading={loading}
          onClick={() => onNavigate('alerts')}
        />
        <KpiCell
          label="Critical Alerts"
          value={loading ? '' : fmt(stats?.alertsBySeverity?.CRITICAL ?? 0)}
          sub="Requires immediate SOC triage"
          colorClass={stats?.alertsBySeverity?.CRITICAL > 0 ? 'critical' : ''}
          loading={loading}
          onClick={() => onNavigate('alerts')}
        />
        <KpiCell
          label="Active Incidents"
          value={loading ? '' : fmt(stats?.openIncidents)}
          sub={loading ? '' : `${fmt(stats?.totalIncidents ?? 0)} total incidents`}
          colorClass={stats?.openIncidents > 0 ? 'critical' : 'healthy'}
          loading={loading}
          onClick={() => onNavigate('incidents')}
        />
        <KpiCell
          label="Active Rules"
          value={loading ? '' : fmt(stats?.activeRules)}
          sub="Heuristic & threshold rules"
          colorClass="accent"
          loading={loading}
          onClick={() => onNavigate('rules')}
        />
      </div>

      {/* Charts & Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', alignItems: 'stretch' }}>
        {/* Severity distribution bar chart */}
        <div className="chart-panel" style={{ minWidth: 0, minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Alert Severity Distribution
              </span>
              <span style={{ fontSize: '0.714rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                ({totalAlertCount} active alerts)
              </span>
            </div>
            <span style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>MongoDB live counts</span>
          </div>

          <div className="chart-body" style={{ flex: 1, minHeight: '170px', padding: '0.75rem 1rem 0.25rem 0.5rem' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.5rem' }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} h="28px" />)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={sevData} layout="vertical" margin={{ top: 8, right: 30, bottom: 4, left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Alerts" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {sevData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Breakdown Pills Footer */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            padding: '0.65rem 1rem 0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.1)'
          }}>
            {sevData.map(d => {
              const pct = totalAlertCount > 0 ? Math.round((d.count / totalAlertCount) * 100) : 0;
              return (
                <div key={d.name} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: d.color, fontFamily: 'var(--font-mono)' }}>
                    {d.count} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defense Posture & Threat Level Panel */}
        <div className="chart-panel" style={{ minWidth: 0, minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-panel-header">
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>Defense Posture & Readiness</span>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
            {loading ? (
              <>
                <Skeleton h="60px" />
                <Skeleton h="40px" />
              </>
            ) : (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{
                      fontSize: '3rem', fontWeight: 800, lineHeight: 1,
                      color: postureScore >= 80 ? 'var(--sev-low)' : postureScore >= 50 ? 'var(--sev-high)' : 'var(--sev-critical)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {postureScore ?? '–'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>

                  {/* Progress track */}
                  <div style={{ height: '7px', background: 'var(--chart-track)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.6rem' }}>
                    <div style={{
                      width: `${postureScore ?? 0}%`, height: '100%', borderRadius: '4px',
                      background: postureScore >= 80 ? 'var(--sev-low)' : postureScore >= 50 ? 'var(--sev-high)' : 'var(--sev-critical)',
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
                    }} />
                  </div>
                </div>

                <div style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  fontSize: '0.73rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)'
                }}>
                  {postureScore >= 80
                    ? 'Security baseline healthy. No uncontained critical ransomware or brute-force campaigns.'
                    : `Active threat detected: ${stats?.alertsBySeverity?.CRITICAL || 0} critical alerts (−16 pts) and ${stats?.alertsBySeverity?.HIGH || 0} high alerts (−6 pts) affecting integrity.`}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {postureScore >= 80
                      ? <ShieldCheck size={16} style={{ color: 'var(--sev-low)' }} />
                      : <ShieldAlert size={16} style={{ color: 'var(--sev-critical)' }} />}
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {postureScore >= 80 ? 'DEFCON 5 — Normal' : postureScore >= 50 ? 'DEFCON 3 — Elevated' : 'DEFCON 2 — Critical Threat'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    4 Rules Armed
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts Table with Real Data */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-title">Recent Triaged Alerts</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              (Real alerts generated by SIEM rule matches)
            </span>
          </div>
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
            <div className="empty-state-title">No recent alerts in queue</div>
            <div className="empty-state-text">
              No detection rules have fired yet. Click any button in the Attack Lab above to generate authentic threat telemetry.
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => handleInjectAttack('BRUTE_FORCE')}>
              Inject SSH Brute Force Attack
            </button>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Ingested Time</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.slice(0, 7).map((a, idx) => (
                  <tr key={a.id ?? idx}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '340px' }}>
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
                    <td className="col-mono col-dim" style={{ fontSize: '0.74rem' }}>{fmtTime(a.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => onNavigate('alerts')}>
                        Triage →
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
