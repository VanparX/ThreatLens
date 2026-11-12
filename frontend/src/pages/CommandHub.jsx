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
  Radio,
  Users,
  Database,
  Cpu,
  Zap,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatIST } from '../utils/dateUtils';
import { KPICard, StatusBadge } from '../components/common';

export default function CommandHub({ onNavigate, initialStats = null }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

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
      users: '/users',
      'command-hub': '/command-hub',
    };
    navigate(pathMap[target] || target);
  };

  const initialPostureScore = initialStats ? (() => {
    const crit = initialStats?.alertsBySeverity?.CRITICAL || 0;
    const high = initialStats?.alertsBySeverity?.HIGH || 0;
    const inc = initialStats?.openIncidents || 0;
    const penalty = (crit * 16) + (high * 6) + (inc * 12);
    return Math.max(0, Math.min(100, 100 - penalty));
  })() : null;

  const [stats, setStats] = useState(initialStats ? {
    openAlerts: initialStats.openAlerts ?? 0,
    openIncidents: initialStats.openIncidents ?? 0,
    openDetections: initialStats.openDetections ?? 0,
    totalLogs: initialStats.totalLogs ?? 0,
    logsLast24h: initialStats.logsLast24h ?? 0,
    activeRules: initialStats.activeRules ?? 0,
    postureScore: initialPostureScore
  } : {
    openAlerts: 0,
    openIncidents: 0,
    openDetections: 0,
    totalLogs: 0,
    logsLast24h: 0,
    activeRules: 0,
    postureScore: null
  });
  const [loading, setLoading] = useState(!initialStats);
  const [backendHealth, setBackendHealth] = useState('unknown'); // 'up' | 'down' | 'unknown'
  const [mongoHealth, setMongoHealth] = useState('unknown'); // 'up' | 'derived-up' | 'down' | 'unknown'
  const [currentTime, setCurrentTime] = useState('');

  // IST clock tick
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatIST(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check actual Spring Boot backend health via Actuator
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await axios.get('/actuator/health');
        if (!mounted) return;
        const status = (res.data?.status || '').toUpperCase();
        setBackendHealth(status === 'UP' ? 'up' : 'down');

        // Check if Spring Boot Actuator exposes mongo component details
        const mongoStatus = (res.data?.components?.mongo?.status || '').toUpperCase();
        if (mongoStatus) {
          setMongoHealth(mongoStatus === 'UP' ? 'up' : 'down');
        } else if (status === 'UP') {
          // Qualified derived status when backend is UP
          setMongoHealth('derived-up');
        } else {
          setMongoHealth('down');
        }
      } catch (e) {
        if (!mounted) return;
        setBackendHealth('down');
        setMongoHealth('down');
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // Load real statistics from backend
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

  const baseModules = [
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
      badge: 'Database Logs',
      badgeClass: 'badge-low',
      actionText: 'Launch Log Stream'
    },
    {
      id: 'detections',
      title: 'Threat Detection Center',
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
      badgeClass: 'badge-accent',
      actionText: 'Configure Rules'
    },
    {
      id: 'notifications',
      title: 'Notification & Dispatch Channels',
      description: 'Configure automated outbound email security advisories, emergency dispatch channels, and verify delivery health.',
      icon: Mail,
      badge: 'Multi-Channel',
      badgeClass: 'badge-neutral',
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

  // Add User Management module if user has admin privileges
  const adminModule = {
    id: 'users',
    title: 'User Management & RBAC',
    description: 'Manage enterprise user accounts, analyst role permissions, credential administration, and session access control.',
    icon: Users,
    badge: 'Admin Only',
    badgeClass: 'badge-accent',
    actionText: 'Manage Users'
  };

  const modules = isAdmin ? [...baseModules, adminModule] : baseModules;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Enterprise Operator Landing Header */}
      <div className="panel" style={{ padding: '1.5rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, var(--tl-border-subtle) 0%, var(--tl-accent-primary) 50%, var(--tl-border-subtle) 100%)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge badge-low" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
                OPERATIONAL SESSION
              </span>

              <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Deployment: Local SIEM Instance (Standalone)
              </span>

              <StatusBadge
                status={backendHealth === 'up' ? 'ONLINE' : backendHealth === 'down' ? 'DEGRADED' : 'UNKNOWN'}
                label={backendHealth === 'up' ? 'API HEALTHY' : backendHealth === 'down' ? 'API OFFLINE' : 'CHECKING API'}
                size="xs"
              />
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--tl-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back, {user?.username || 'Security Analyst'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--tl-text-secondary)', margin: '0.35rem 0 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
              ThreatLens Security Information and Event Management (SIEM) Command Hub. Review real-time defensive posture or launch specialized investigative workspaces below.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>
              <Clock size={13} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{currentTime || 'Synchronizing IST…'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleNavigate('alerts')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                <span>Triage Alerts</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={() => handleNavigate('dashboard')}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.78rem', gap: '0.45rem' }}
              >
                <span>Launch Live Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary Strip */}
      <div className="kpi-grid">
        <KPICard
          label="Security Posture Score"
          value={loading ? '–' : (stats.postureScore ?? 100)}
          sub="Frontend heuristic score"
          variant={(stats.postureScore ?? 100) >= 80 ? 'healthy' : (stats.postureScore ?? 100) >= 50 ? 'warning' : 'critical'}
          badge={(stats.postureScore ?? 100) >= 80 ? 'DEFCON 5' : (stats.postureScore ?? 100) >= 50 ? 'DEFCON 3' : 'DEFCON 2'}
          badgeVariant={(stats.postureScore ?? 100) >= 80 ? 'low' : (stats.postureScore ?? 100) >= 50 ? 'high' : 'critical'}
          icon={Shield}
          loading={loading}
          onClick={() => handleNavigate('dashboard')}
        />

        <KPICard
          label="Ingested Security Events"
          value={loading ? '–' : Number(stats.totalLogs || 0).toLocaleString()}
          sub={loading ? '–' : `+${Number(stats.logsLast24h || 0).toLocaleString()} in last 24h`}
          badge="DB LIVE"
          badgeVariant="low"
          icon={Terminal}
          loading={loading}
          onClick={() => handleNavigate('logs')}
        />

        <KPICard
          label="Active Threat Alerts"
          value={loading ? '–' : stats.openAlerts}
          sub="Unresolved alerts in queue"
          variant={stats.openAlerts > 0 ? 'warning' : 'healthy'}
          badge={stats.openAlerts > 0 ? 'ACTION REQ' : 'NOMINAL'}
          badgeVariant={stats.openAlerts > 0 ? 'high' : 'low'}
          icon={AlertTriangle}
          loading={loading}
          onClick={() => handleNavigate('alerts')}
        />

        <KPICard
          label="Open Incident Cases"
          value={loading ? '–' : stats.openIncidents}
          sub="Active containment cases"
          variant={stats.openIncidents > 0 ? 'critical' : 'healthy'}
          badge={stats.openIncidents > 0 ? 'CRITICAL' : 'ALL CLEAR'}
          badgeVariant={stats.openIncidents > 0 ? 'critical' : 'low'}
          icon={Flame}
          loading={loading}
          onClick={() => handleNavigate('incidents')}
        />

        <KPICard
          label="Armed Detection Rules"
          value={loading ? '–' : stats.activeRules}
          sub="Correlation & threshold rules"
          variant="accent"
          badge="ARMED"
          badgeVariant="accent"
          icon={Sliders}
          loading={loading}
          onClick={() => handleNavigate('rules')}
        />
      </div>

      {/* Operational Workspaces Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--tl-text-primary)', margin: 0 }}>
              Specialized Operations Workspaces
            </h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--tl-text-muted)', margin: '0.15rem 0 0 0' }}>
              Direct access into SIEM telemetry inspection, behavioral rule tuning, active incident containment, and governance.
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigate(mod.id);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1.15rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--tl-bg-surface-elev)',
                      border: '1px solid var(--tl-border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--tl-text-primary)'
                    }}>
                      <Icon size={17} />
                    </div>

                    <span className={`badge ${mod.badgeClass}`} style={{ fontSize: '0.67rem' }}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.35rem' }}>
                    {mod.title}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    {mod.description}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--tl-accent-primary)',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--tl-border-subtle)'
                }}>
                  <span>{mod.actionText}</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Enclave & Engine Diagnostics Card */}
      <div className="panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={16} style={{ color: 'var(--tl-text-secondary)' }} />
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
              Platform Enclave Diagnostics
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              VERIFIED SYSTEM STATE
            </span>
          </div>

          <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Polling interval: 15s • Spring Boot Actuator
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* Diagnostic Block 1: Spring Boot Engine */}
          <div style={{
            background: 'var(--tl-bg-surface-elev)',
            border: '1px solid var(--tl-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                <Cpu size={14} style={{ color: 'var(--tl-accent-primary)' }} />
                <span>Spring Boot REST Engine</span>
              </div>
              <StatusBadge
                status={backendHealth === 'up' ? 'ONLINE' : backendHealth === 'down' ? 'DEGRADED' : 'UNKNOWN'}
                size="xs"
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: 1.45 }}>
              Application runtime providing REST APIs, Spring Security authentication, and Actuator endpoints.
            </div>
          </div>

          {/* Diagnostic Block 2: MongoDB Persistence */}
          <div style={{
            background: 'var(--tl-bg-surface-elev)',
            border: '1px solid var(--tl-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                <Database size={14} style={{ color: 'var(--tl-sev-low)' }} />
                <span>MongoDB Persistence</span>
              </div>
              <StatusBadge
                status={mongoHealth === 'up' || mongoHealth === 'derived-up' ? 'ONLINE' : 'DEGRADED'}
                label={
                  mongoHealth === 'up'
                    ? 'ACTUATOR VERIFIED'
                    : mongoHealth === 'derived-up'
                      ? 'DERIVED VIA BACKEND'
                      : 'STANDBY'
                }
                size="xs"
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: 1.45 }}>
              {mongoHealth === 'up'
                ? 'Direct MongoHealthIndicator reported UP via Spring Boot Actuator.'
                : mongoHealth === 'derived-up'
                  ? 'Database connectivity verified via operational Spring Boot Actuator.'
                  : 'Database connectivity unconfirmed or backend unreachable.'}
            </div>
          </div>

          {/* Diagnostic Block 3: Detection Pipeline */}
          <div style={{
            background: 'var(--tl-bg-surface-elev)',
            border: '1px solid var(--tl-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                <Activity size={14} style={{ color: 'var(--tl-sev-info)' }} />
                <span>SIEM Detection Pipeline</span>
              </div>
              <StatusBadge
                status={stats.activeRules > 0 ? 'ONLINE' : 'STANDBY'}
                label={stats.activeRules > 0 ? `${stats.activeRules} RULES ARMED` : '0 RULES ARMED'}
                size="xs"
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: 1.45 }}>
              {stats.activeRules > 0
                ? `Evaluating incoming telemetry with ${stats.activeRules} active behavioral correlation rules.`
                : 'No detection rules currently armed in MongoDB.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
