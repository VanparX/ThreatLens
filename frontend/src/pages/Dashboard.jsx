import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ArrowRight, ShieldCheck, ShieldAlert,
  AlertTriangle, Flame, ScrollText, Sliders, Zap,
  Play, Pause, Radio, Terminal, CheckCircle2, AlertOctagon, Activity,
  ChevronRight, Shield, Bell, Layers, ExternalLink, Info, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { injectNormalEvent, injectAttack } from '../utils/telemetryService';
import { formatIST, formatISTTime } from '../utils/dateUtils';
import { KPICard, StatusBadge, DetailDrawer } from '../components/common';

/* ---- Format number helper ---- */
function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : '–';
}

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SEV_COLOR = {
  CRITICAL: 'var(--tl-sev-critical)',
  HIGH:     'var(--tl-sev-high)',
  MEDIUM:   'var(--tl-sev-medium)',
  LOW:      'var(--tl-sev-low)',
};

/* ---- Custom Precision SOC chart tooltip ---- */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--tl-bg-surface-elev)',
      border: '1px solid var(--tl-border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ color: 'var(--tl-text-muted)', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.714rem' }}>
        {label} SEVERITY
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--tl-text-primary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ onNavigate, initialStats = null, initialDrawerOpen = false }) {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(initialStats ? new Date() : null);

  // Attack simulator drawer state
  const [isSimDrawerOpen, setIsSimDrawerOpen] = useState(initialDrawerOpen);
  const [isStreaming, setIsStreaming] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [streamCount, setStreamCount] = useState(0);
  const streamTimerRef = useRef(null);

  // Activity list tab: 'alerts' or 'detections'
  const [activeTab, setActiveTab] = useState('alerts');

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

  // Fetch dashboard stats from real backend endpoint
  const fetchStats = useCallback(async () => {
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
    fetchStats();
  }, [fetchStats]);

  // Periodic auto-refresh (6s)
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchStats, 6000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchStats]);

  // Telemetry stream generator loop
  useEffect(() => {
    if (isStreaming) {
      streamTimerRef.current = setInterval(async () => {
        try {
          await injectNormalEvent();
          setStreamCount((prev) => prev + 1);
          // Periodically sync dashboard metrics
          fetchStats();
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
  }, [isStreaming, fetchStats]);

  // Attack injector action
  const handleInjectAttack = async (type) => {
    setActiveSimulation(type);
    setSimStatus({ loading: true, message: `Injecting ${type} telemetry into ingestion pipeline...` });
    try {
      const result = await injectAttack(type);
      setSimStatus({
        success: true,
        type,
        title: result.title,
        message: result.message,
        severity: result.severity,
        time: `${formatISTTime(new Date())} IST`
      });
      // Refresh dashboard immediately
      setTimeout(() => fetchStats(), 600);
    } catch (err) {
      setSimStatus({
        success: false,
        type,
        title: 'Simulation Error',
        message: err.message || 'Failed to ingest attack log',
        time: `${formatISTTime(new Date())} IST`
      });
    } finally {
      setActiveSimulation(null);
    }
  };

  // Posture score — calculated deterministically from backend-supported alert & incident counts
  const postureScore = (() => {
    if (!stats || loading) return null;
    const crit = stats.alertsBySeverity?.CRITICAL || 0;
    const high = stats.alertsBySeverity?.HIGH     || 0;
    const inc  = stats.openIncidents || 0;
    const penalty = (crit * 16) + (high * 6) + (inc * 12);
    return Math.max(0, Math.min(100, 100 - penalty));
  })();

  // Severity distribution for chart
  const sevData = SEV_ORDER.map((sev) => ({
    name: sev.charAt(0) + sev.slice(1).toLowerCase(),
    severity: sev,
    count: stats?.alertsBySeverity?.[sev] ?? 0,
    color: SEV_COLOR[sev],
  }));
  const totalAlertCount = sevData.reduce((acc, d) => acc + d.count, 0);

  // Recent alerts and detections from backend
  const recentAlerts = stats?.recentAlerts ?? [];
  const recentDetections = stats?.recentDetections ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Precision SOC Page Header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 className="page-title">Security Operations Overview</h1>
            {loading && !stats ? (
              <span
                className="badge badge-neutral"
                style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', fontFamily: 'var(--font-mono)' }}
              >
                CONNECTING…
              </span>
            ) : stats ? (
              <span
                className="badge badge-low"
                style={{
                  fontSize: '0.62rem',
                  padding: '0.1rem 0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
                SIEM CONNECTED
              </span>
            ) : (
              <span
                className="badge badge-critical"
                style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', fontFamily: 'var(--font-mono)' }}
              >
                DISCONNECTED
              </span>
            )}

            {isStreaming && (
              <span
                className="badge badge-accent"
                style={{
                  fontSize: '0.62rem',
                  padding: '0.1rem 0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span className="status-dot status-dot-warning pulse" style={{ width: '5px', height: '5px' }} />
                [SIMULATOR] TEST STREAM ({streamCount})
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Enterprise threat monitoring, behavioral detection engine heuristics, and defensive readiness.
          </p>
        </div>

        <div className="page-actions" style={{ gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Attack Simulator Launcher CTA */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsSimDrawerOpen(true)}
            title="Open Threat Simulation & Attack Lab drawer"
            style={{
              gap: '0.45rem',
              borderColor: isStreaming ? 'var(--tl-sev-high)' : undefined,
              background: isStreaming ? 'var(--tl-sev-high-bg)' : undefined
            }}
          >
            <Zap size={13} style={{ color: isStreaming ? 'var(--tl-sev-high)' : 'var(--tl-sev-high)' }} />
            <span>Attack Simulator Lab</span>
            {isStreaming && (
              <span className="badge badge-high" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem' }}>
                SIMULATING
              </span>
            )}
          </button>

          {/* Auto-Refresh Switch (truthfully labeled as polling) */}
          <label
            title="Polls /api/dashboard/stats every 6 seconds over HTTP"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.764rem',
              color: 'var(--tl-text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '0.35rem 0.5rem',
              background: 'var(--tl-bg-surface-elev)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--tl-border-subtle)'
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--tl-accent-primary)', width: '13px', height: '13px', cursor: 'pointer' }}
            />
            Auto-refresh (6s polling)
          </label>

          {/* Manual Refresh Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchStats}
            disabled={loading}
            title="Refresh dashboard metrics"
            style={{ minWidth: '95px', justifyContent: 'center' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>{lastRefresh ? `${formatISTTime(lastRefresh)} IST` : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Primary Telemetry Metrics Strip (KPICard Grid) */}
      <div className="kpi-grid">
        <KPICard
          label="Security Events"
          value={loading ? '–' : fmt(stats?.totalLogs)}
          sub={loading ? '–' : `+${fmt(stats?.logsLast24h ?? 0)} in last 24h`}
          icon={ScrollText}
          badge="INGESTED"
          badgeVariant="neutral"
          loading={loading}
          onClick={() => handleNavigate('logs')}
        />
        <KPICard
          label="Threat Detections"
          value={loading ? '–' : fmt(stats?.totalDetections)}
          sub={loading ? '–' : `${fmt(stats?.openDetections ?? 0)} active open`}
          variant={stats?.openDetections > 0 ? 'warning' : 'default'}
          icon={Activity}
          badge={stats?.openDetections > 0 ? 'ACTIVE' : 'NOMINAL'}
          badgeVariant={stats?.openDetections > 0 ? 'high' : 'low'}
          loading={loading}
          onClick={() => handleNavigate('detections')}
        />
        <KPICard
          label="Open Alerts"
          value={loading ? '–' : fmt(stats?.openAlerts)}
          sub={loading ? '–' : `${fmt(stats?.totalAlerts ?? 0)} total generated`}
          variant={stats?.openAlerts > 0 ? 'warning' : 'healthy'}
          icon={AlertTriangle}
          badge={stats?.openAlerts > 0 ? 'TRIAGE' : 'CLEAR'}
          badgeVariant={stats?.openAlerts > 0 ? 'high' : 'low'}
          loading={loading}
          onClick={() => handleNavigate('alerts')}
        />
        <KPICard
          label="Critical Alerts"
          value={loading ? '–' : fmt(stats?.alertsBySeverity?.CRITICAL ?? 0)}
          sub="Requires immediate SOC triage"
          variant={(stats?.alertsBySeverity?.CRITICAL ?? 0) > 0 ? 'critical' : 'healthy'}
          icon={Flame}
          badge={(stats?.alertsBySeverity?.CRITICAL ?? 0) > 0 ? 'URGENT' : 'NOMINAL'}
          badgeVariant={(stats?.alertsBySeverity?.CRITICAL ?? 0) > 0 ? 'critical' : 'low'}
          loading={loading}
          onClick={() => handleNavigate('alerts')}
        />
        <KPICard
          label="Active Incidents"
          value={loading ? '–' : fmt(stats?.openIncidents)}
          sub={loading ? '–' : `${fmt(stats?.totalIncidents ?? 0)} total incidents`}
          variant={stats?.openIncidents > 0 ? 'critical' : 'healthy'}
          icon={ShieldAlert}
          badge={stats?.openIncidents > 0 ? 'CONTAIN' : 'CLOSED'}
          badgeVariant={stats?.openIncidents > 0 ? 'critical' : 'low'}
          loading={loading}
          onClick={() => handleNavigate('incidents')}
        />
        <KPICard
          label="Active Rules"
          value={loading ? '–' : fmt(stats?.activeRules)}
          sub="Correlation & behavioral rules"
          variant="accent"
          icon={Sliders}
          badge="ARMED"
          badgeVariant="accent"
          loading={loading}
          onClick={() => handleNavigate('rules')}
        />
      </div>

      {/* Analytics & Defense Posture Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1rem', alignItems: 'stretch' }}>
        {/* Severity Distribution Bar Chart */}
        <div className="chart-panel" style={{ minWidth: 0, minHeight: '270px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Alert Severity Distribution
              </span>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginLeft: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                ({totalAlertCount} active alerts)
              </span>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              MONGODB LIVE COUNTS
            </span>
          </div>

          <div className="chart-body" style={{ flex: 1, minHeight: '175px', padding: '0.75rem 1rem 0.25rem 0.5rem' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.5rem' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '28px', borderRadius: 'var(--radius-sm)' }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={sevData} layout="vertical" margin={{ top: 8, right: 30, bottom: 4, left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="var(--tl-chart-grid)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--tl-text-secondary)', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Alerts" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {sevData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Severity Breakdown Footer Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            padding: '0.65rem 1rem',
            borderTop: '1px solid var(--tl-border-subtle)',
            background: 'var(--tl-bg-surface-elev)'
          }}>
            {sevData.map((d) => {
              const pct = totalAlertCount > 0 ? Math.round((d.count / totalAlertCount) * 100) : 0;
              return (
                <div key={d.name} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: d.color, fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                    {d.count} <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)' }}>({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defense Posture & DEFCON Readiness Panel */}
        <div className="chart-panel" style={{ minWidth: 0, minHeight: '270px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
              Defense Posture &amp; Readiness
            </span>
            <span className="badge badge-accent" style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              HEURISTIC SCORE
            </span>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
            {loading ? (
              <>
                <div className="skeleton" style={{ height: '60px', borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--radius-sm)' }} />
              </>
            ) : (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                      <span style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        color: (postureScore ?? 100) >= 80
                          ? 'var(--tl-sev-low)'
                          : (postureScore ?? 100) >= 50
                            ? 'var(--tl-sev-high)'
                            : 'var(--tl-sev-critical)',
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {postureScore ?? '–'}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        / 100
                      </span>
                    </div>

                    <StatusBadge
                      status={(postureScore ?? 100) >= 80 ? 'LOW' : (postureScore ?? 100) >= 50 ? 'HIGH' : 'CRITICAL'}
                      label={(postureScore ?? 100) >= 80 ? 'DEFCON 5' : (postureScore ?? 100) >= 50 ? 'DEFCON 3' : 'DEFCON 2'}
                      pulse={(postureScore ?? 100) < 80}
                      size="sm"
                    />
                  </div>

                  {/* Progress track */}
                  <div style={{ height: '7px', background: 'var(--tl-chart-track)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.75rem' }}>
                    <div style={{
                      width: `${postureScore ?? 0}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: (postureScore ?? 100) >= 80
                        ? 'var(--tl-sev-low)'
                        : (postureScore ?? 100) >= 50
                          ? 'var(--tl-sev-high)'
                          : 'var(--tl-sev-critical)',
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
                    }} />
                  </div>
                </div>

                <div style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  fontSize: '0.735rem',
                  lineHeight: 1.45,
                  color: 'var(--tl-text-secondary)'
                }}>
                  {(postureScore ?? 100) >= 80 ? (
                    <span>
                      <strong style={{ color: 'var(--tl-sev-low)' }}>Security baseline healthy.</strong> No uncontained critical ransomware beacons or brute-force campaigns detected.
                    </span>
                  ) : (
                    <span>
                      <strong style={{ color: 'var(--tl-sev-critical)' }}>Threat baseline degraded:</strong>{' '}
                      {stats?.alertsBySeverity?.CRITICAL || 0} critical alerts (−16 pts ea) and {stats?.alertsBySeverity?.HIGH || 0} high alerts (−6 pts ea) require SOC intervention.
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--tl-border-subtle)',
                  paddingTop: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {(postureScore ?? 100) >= 80 ? (
                      <ShieldCheck size={16} style={{ color: 'var(--tl-sev-low)' }} />
                    ) : (
                      <ShieldAlert size={16} style={{ color: 'var(--tl-sev-critical)' }} />
                    )}
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      {(postureScore ?? 100) >= 80 ? 'DEFCON 5 — Normal' : (postureScore ?? 100) >= 50 ? 'DEFCON 3 — Elevated' : 'DEFCON 2 — Critical Threat'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {loading ? '–' : `${stats?.activeRules ?? 0} Rules Armed`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Triaged Security Events / Live Pipeline Feed */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="panel-title">Triaged Security Feeds</span>
            {/* Tab Toggles: Alerts vs Detections */}
            <div style={{ display: 'inline-flex', background: 'var(--tl-bg-surface-elev)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--tl-border-subtle)' }}>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setActiveTab('alerts')}
                style={{
                  background: activeTab === 'alerts' ? 'var(--tl-accent-subtle)' : 'transparent',
                  color: activeTab === 'alerts' ? 'var(--tl-accent-primary)' : 'var(--tl-text-secondary)',
                  fontWeight: activeTab === 'alerts' ? 600 : 400,
                  fontSize: '0.714rem',
                  padding: '0.2rem 0.55rem'
                }}
              >
                Alerts ({recentAlerts.length})
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setActiveTab('detections')}
                style={{
                  background: activeTab === 'detections' ? 'var(--tl-accent-subtle)' : 'transparent',
                  color: activeTab === 'detections' ? 'var(--tl-accent-primary)' : 'var(--tl-text-secondary)',
                  fontWeight: activeTab === 'detections' ? 600 : 400,
                  fontSize: '0.714rem',
                  padding: '0.2rem 0.55rem'
                }}
              >
                Detections ({recentDetections.length})
              </button>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleNavigate(activeTab === 'alerts' ? 'alerts' : 'detections')}
            style={{ fontSize: '0.75rem' }}
          >
            <span>View all in {activeTab === 'alerts' ? 'Alert Center' : 'Detection Center'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '36px', borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
        ) : activeTab === 'alerts' ? (
          recentAlerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <ShieldCheck size={36} style={{ color: 'var(--tl-sev-low)', opacity: 0.7 }} />
              <div className="empty-state-title" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                No active alerts in queue
              </div>
              <div className="empty-state-text" style={{ fontSize: '0.75rem', maxWidth: '420px', margin: '0.25rem auto 0' }}>
                No threshold or behavioral rules have fired yet. Open the Attack Simulator Lab to inject controlled test telemetry.
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem', gap: '0.4rem' }}
                onClick={() => setIsSimDrawerOpen(true)}
              >
                <Zap size={13} style={{ color: 'var(--tl-sev-high)' }} />
                <span>Launch Attack Simulator Lab</span>
              </button>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Alert Title</th>
                    <th style={{ width: '110px' }}>Severity</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '190px' }}>Ingested Time (IST)</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.slice(0, 7).map((a, idx) => (
                    <tr key={a.id ?? idx}>
                      <td style={{ color: 'var(--tl-text-primary)', fontWeight: 500, maxWidth: '340px' }}>
                        <span title={a.title} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={a.severity || 'LOW'} size="xs" />
                      </td>
                      <td>
                        <StatusBadge status={a.status || 'OPEN'} size="xs" />
                      </td>
                      <td className="col-mono col-dim" style={{ fontSize: '0.74rem' }}>
                        {formatIST(a.createdAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleNavigate('alerts')}
                          style={{ color: 'var(--tl-accent-primary)', fontWeight: 600 }}
                        >
                          Triage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Recent Detections Tab */
          recentDetections.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <ShieldCheck size={36} style={{ color: 'var(--tl-sev-low)', opacity: 0.7 }} />
              <div className="empty-state-title" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                No active detections in queue
              </div>
              <div className="empty-state-text" style={{ fontSize: '0.75rem', maxWidth: '420px', margin: '0.25rem auto 0' }}>
                No rule evaluations have matched inbound telemetry. Open the Attack Simulator Lab to inject controlled test events.
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem', gap: '0.4rem' }}
                onClick={() => setIsSimDrawerOpen(true)}
              >
                <Zap size={13} style={{ color: 'var(--tl-sev-high)' }} />
                <span>Launch Attack Simulator Lab</span>
              </button>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Detection Title / Rule</th>
                    <th style={{ width: '110px' }}>Severity</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '190px' }}>Evaluated Time (IST)</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDetections.slice(0, 7).map((d, idx) => (
                    <tr key={d.id ?? idx}>
                      <td style={{ color: 'var(--tl-text-primary)', fontWeight: 500, maxWidth: '340px' }}>
                        <span title={d.title} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.title}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={d.severity || 'LOW'} size="xs" />
                      </td>
                      <td>
                        <StatusBadge status={d.status || 'OPEN'} size="xs" />
                      </td>
                      <td className="col-mono col-dim" style={{ fontSize: '0.74rem' }}>
                        {formatIST(d.createdAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleNavigate('detections')}
                          style={{ color: 'var(--tl-accent-primary)', fontWeight: 600 }}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Dedicated Threat Simulation & Attack Lab Drawer (Slide-over) */}
      <DetailDrawer
        isOpen={isSimDrawerOpen}
        onClose={() => setIsSimDrawerOpen(false)}
        title="Threat Simulation & Attack Lab"
        subtitle="Synthetic enterprise telemetry injector for SIEM detection verification"
        width="540px"
        badge={
          isStreaming ? (
            <StatusBadge status="HIGH" label="TEST STREAM ACTIVE" pulse size="xs" />
          ) : (
            <StatusBadge status="STANDBY" label="STANDBY" size="xs" />
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Explicit Synthetic Telemetry Notice Banner */}
          <div style={{
            padding: '0.75rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--tl-bg-surface)',
            border: '1px solid var(--tl-border-default)',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--tl-text-secondary)',
            display: 'flex',
            gap: '0.65rem'
          }}>
            <Info size={16} style={{ color: 'var(--tl-accent-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.15rem' }}>
                SYNTHETIC SIMULATION ENVIRONMENT (NOT COLLECTOR TELEMETRY)
              </div>
              Dispatches controlled synthetic event envelopes directly into the Spring Boot SIEM pipeline (<code>/api/logs</code>) to evaluate sliding-window threshold rules, risk scoring, and automated alert triage. Test data is clearly distinguishable from genuine collector telemetry.
            </div>
          </div>

          {/* Section 1: Background Telemetry Streamer */}
          <div style={{
            background: 'var(--tl-bg-surface-elev)',
            border: '1px solid var(--tl-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} className={isStreaming ? 'pulse-fast' : ''} style={{ color: isStreaming ? 'var(--tl-sev-high)' : 'var(--tl-text-secondary)' }} />
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    Synthetic Baseline Telemetry Generator
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)' }}>
                    Injects synthetic non-threat test events (Kerberos, DLP, firewall egress) every 3.5s for pipeline evaluation
                  </div>
                </div>
              </div>

              <button
                className={`btn btn-sm ${isStreaming ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setIsStreaming(!isStreaming)}
                disabled={!canWrite}
                title={!canWrite ? 'Log ingestion requires SECURITY_ANALYST or ADMIN role' : undefined}
                style={{ minWidth: '120px', justifyContent: 'center' }}
              >
                {isStreaming ? (
                  <>
                    <Pause size={13} /> Pause Stream
                  </>
                ) : (
                  <>
                    <Play size={13} /> Start Stream
                  </>
                )}
              </button>
            </div>

            {isStreaming && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--tl-sev-high-bg)',
                border: '1px solid var(--tl-sev-high-border)',
                fontSize: '0.714rem',
                color: 'var(--tl-sev-high)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={13} /> Synthetic Streamer Active: 1 test event / 3.5s
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {streamCount} test events injected this session
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Attack Injection Scenarios */}
          <div>
            <div style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              One-Click Cyber Attack Scenarios
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Scenario 1: SSH Brute Force */}
              <div style={{
                background: 'var(--tl-bg-surface-elev)',
                border: '1px solid var(--tl-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <Zap size={14} style={{ color: 'var(--tl-sev-high)' }} />
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      SSH Password Brute Force
                    </span>
                    <StatusBadge status="HIGH" size="xs" />
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', lineHeight: 1.4 }}>
                    Dispatches 5 rapid authentication failures against <code>auth-dc-01</code>. Triggers frequency threshold rule (≥3 in 60s).
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleInjectAttack('BRUTE_FORCE')}
                  disabled={!canWrite || activeSimulation !== null}
                  title={!canWrite ? 'Requires Analyst/Admin role' : 'Inject SSH Brute Force'}
                  style={{ minWidth: '100px', flexShrink: 0, justifyContent: 'center' }}
                >
                  {activeSimulation === 'BRUTE_FORCE' ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    'Inject Attack'
                  )}
                </button>
              </div>

              {/* Scenario 2: Ransomware Outbreak */}
              <div style={{
                background: 'var(--tl-bg-surface-elev)',
                border: '1px solid var(--tl-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <AlertOctagon size={14} style={{ color: 'var(--tl-sev-critical)' }} />
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      Ransomware Canary Beacon
                    </span>
                    <StatusBadge status="CRITICAL" size="xs" />
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', lineHeight: 1.4 }}>
                    Mass canary file encryption (.locked extension) with C2 server heartbeat. Auto-creates CRITICAL alert and depresses DEFCON.
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleInjectAttack('RANSOMWARE')}
                  disabled={!canWrite || activeSimulation !== null}
                  title={!canWrite ? 'Requires Analyst/Admin role' : 'Inject Ransomware Outbreak'}
                  style={{ minWidth: '100px', flexShrink: 0, justifyContent: 'center' }}
                >
                  {activeSimulation === 'RANSOMWARE' ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    'Inject Attack'
                  )}
                </button>
              </div>

              {/* Scenario 3: Port Scan Sweep */}
              <div style={{
                background: 'var(--tl-bg-surface-elev)',
                border: '1px solid var(--tl-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <Radio size={14} style={{ color: 'var(--tl-sev-medium)' }} />
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      TCP SYN Port Scan Sweep
                    </span>
                    <StatusBadge status="MEDIUM" size="xs" />
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', lineHeight: 1.4 }}>
                    External perimeter reconnaissance sweep across 6 ports (21, 22, 23, 80, 443, 8080). Triggers port scan behavioral rule.
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleInjectAttack('PORT_SCAN')}
                  disabled={!canWrite || activeSimulation !== null}
                  title={!canWrite ? 'Requires Analyst/Admin role' : 'Inject Port Scan'}
                  style={{ minWidth: '100px', flexShrink: 0, justifyContent: 'center' }}
                >
                  {activeSimulation === 'PORT_SCAN' ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    'Inject Attack'
                  )}
                </button>
              </div>

              {/* Scenario 4: Privilege Escalation */}
              <div style={{
                background: 'var(--tl-bg-surface-elev)',
                border: '1px solid var(--tl-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <ShieldAlert size={14} style={{ color: 'var(--tl-sev-high)' }} />
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      Unauthorized Sudo Escalation
                    </span>
                    <StatusBadge status="HIGH" size="xs" />
                  </div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', lineHeight: 1.4 }}>
                    Unauthorized execution of <code>/usr/bin/sudo /bin/bash</code> by non-wheel service account on Kubernetes node.
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleInjectAttack('PRIV_ESC')}
                  disabled={!canWrite || activeSimulation !== null}
                  title={!canWrite ? 'Requires Analyst/Admin role' : 'Inject Privilege Escalation'}
                  style={{ minWidth: '100px', flexShrink: 0, justifyContent: 'center' }}
                >
                  {activeSimulation === 'PRIV_ESC' ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    'Inject Attack'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Simulation Execution Feedback Banner */}
          {simStatus && (
            <div style={{
              padding: '0.75rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              background: simStatus.success ? 'var(--tl-sev-low-bg)' : 'var(--tl-sev-critical-bg)',
              border: `1px solid ${simStatus.success ? 'var(--tl-sev-low-border)' : 'var(--tl-sev-critical-border)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: simStatus.success ? 'var(--tl-sev-low)' : 'var(--tl-sev-critical)', fontWeight: 600 }}>
                  {simStatus.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{simStatus.title}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {simStatus.time}
                </span>
              </div>
              <div style={{ color: 'var(--tl-text-secondary)', lineHeight: 1.45 }}>
                {simStatus.message}
              </div>
            </div>
          )}
        </div>
      </DetailDrawer>
    </div>
  );
}
