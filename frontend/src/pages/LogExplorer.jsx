import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, Search, RefreshCw, PlusCircle, X, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

const SEV_OPTS  = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

// Backend LogEventType enum source of truth
const TYPE_OPTS = [
  '',
  'AUTHENTICATION_FAILURE',
  'AUTHENTICATION_SUCCESS',
  'AUTHORIZATION_FAILURE',
  'PORT_SCAN',
  'BRUTE_FORCE',
  'SQL_INJECTION',
  'XSS_ATTEMPT',
  'MALWARE_DETECTED',
  'RANSOMWARE_DETECTED',
  'SUSPICIOUS_PROCESS',
  'NETWORK_ANOMALY',
  'FILE_INTEGRITY_VIOLATION',
  'PRIVILEGE_ESCALATION',
  'DATA_EXFILTRATION',
  'POLICY_VIOLATION',
  'SYSTEM_ERROR',
  'OTHER'
];

export default function LogExplorer() {
  const { canWrite } = useAuth();

  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sev, setSev]             = useState('');
  const [type, setType]           = useState('');
  const [ip, setIp]               = useState('');
  const [ipInput, setIpInput]     = useState('');
  const [simulating, setSimulating] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [manual, setManual]       = useState({
    eventType: 'AUTHENTICATION_FAILURE',
    severity: 'HIGH',
    sourceIp: '192.168.1.100',
    destinationIp: '10.0.0.1',
    sourceSystem: 'auth-gateway',
    message: 'Authentication failure for user account'
  });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, size: 20 };
      if (sev)  params.severity  = sev;
      if (type) params.eventType = type;
      if (ip)   params.sourceIp  = ip;
      const res = await api.get('/logs', { params });
      const d = res?.data ?? res;
      setLogs(d.content ?? []);
      setTotalPages(d.totalPages ?? 0);
      setTotalElements(d.totalElements ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load security logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, sev, type, ip]);

  const simulate = async (kind) => {
    if (!canWrite) {
      setSimResult({ ok: false, msg: 'Security Analyst or Admin role required to execute simulations' });
      return;
    }
    setSimulating(kind); setSimResult(null);
    try {
      const base = { timestamp: new Date().toISOString() };
      if (kind === 'BRUTE_FORCE') {
        const src = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
        for (let i = 0; i < 5; i++) {
          await api.post('/logs', {
            ...base,
            sourceIp: src,
            destinationIp: '10.0.0.5',
            eventType: 'AUTHENTICATION_FAILURE',
            severity: 'HIGH',
            sourceSystem: 'ssh-bastion-01',
            message: `SSH password authentication failed for invalid user root from ${src} (attempt ${i + 1}/5)`,
            metadata: { username: 'root', port: 22 }
          });
        }
        setSimResult({ ok: true, msg: `5 authentication failure events dispatched from ${src} (triggers SSH Brute Force rule)` });
      } else if (kind === 'RANSOMWARE') {
        await api.post('/logs', {
          ...base,
          sourceIp: '10.0.4.88',
          destinationIp: '198.51.100.200',
          eventType: 'RANSOMWARE_DETECTED',
          severity: 'CRITICAL',
          sourceSystem: 'edr-agent-finance',
          message: 'Mass file encryption detected (.locked extension). Cryptolocker signature match.',
          metadata: { affectedFiles: 1420 }
        });
        setSimResult({ ok: true, msg: 'CRITICAL ransomware beacon ingested — automatic alert triggered' });
      } else if (kind === 'PORT_SCAN') {
        await api.post('/logs', {
          ...base,
          sourceIp: '203.0.113.45',
          destinationIp: '10.0.0.1',
          eventType: 'PORT_SCAN',
          severity: 'MEDIUM',
          sourceSystem: 'edge-firewall-01',
          message: 'SYN sweep detected across ports 21, 22, 23, 80, 443, 8080',
          metadata: { portCount: 6 }
        });
        setSimResult({ ok: true, msg: 'Port scan reconnaissance event ingested' });
      } else if (kind === 'PRIV_ESC') {
        await api.post('/logs', {
          ...base,
          sourceIp: '',
          destinationIp: '10.0.2.14',
          eventType: 'PRIVILEGE_ESCALATION',
          severity: 'HIGH',
          sourceSystem: 'prod-k8s-worker-03',
          message: 'Unauthorized sudo privilege escalation attempt by non-sudoer daemon-svc: /bin/cat /etc/shadow',
          metadata: { sudo_user: 'daemon-svc', sudo_status: 'DENIED_NOT_IN_SUDOERS' }
        });
        setSimResult({ ok: true, msg: 'Privilege escalation event ingested' });
      }
      load();
    } catch (err) {
      setSimResult({ ok: false, msg: err.message || 'Simulation ingestion failed' });
    } finally {
      setSimulating(null);
    }
  };

  const submitManual = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      setSimResult({ ok: false, msg: 'Security Analyst or Admin role required for manual ingestion' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/logs', { ...manual, timestamp: new Date().toISOString() });
      setSimResult({ ok: true, msg: 'Custom security event successfully ingested' });
      setShowManual(false);
      load();
    } catch (err) {
      setSimResult({ ok: false, msg: err.message || 'Failed to ingest log' });
      setLoading(false);
    }
  };

  const SIMS = [
    { key: 'BRUTE_FORCE', label: 'SSH Brute Force (5×)', sev: 'HIGH' },
    { key: 'RANSOMWARE',  label: 'Ransomware Beacon',    sev: 'CRITICAL' },
    { key: 'PORT_SCAN',   label: 'Port Scan Sweep',      sev: 'MEDIUM' },
    { key: 'PRIV_ESC',    label: 'Privilege Escalation', sev: 'HIGH' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Security Logs</h1>
          <p className="page-subtitle">Ingested security events from monitored sources. Use the simulator to generate test events.</p>
        </div>
        <div className="page-actions">
          {canWrite && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(s => !s)}>
              <PlusCircle size={13} /> {showManual ? 'Close' : 'Manual Ingest'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Simulator panel */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Play size={14} style={{ color: 'var(--sev-high)' }} />
            <span className="panel-title">Attack Event Simulator</span>
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
              Simulation only — generates authentic test events
            </span>
            {!canWrite && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <ShieldAlert size={12} style={{ color: 'var(--sev-high)' }} /> Read-only mode
              </span>
            )}
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SIMS.map(s => (
            <button
              key={s.key}
              className="btn btn-secondary btn-sm"
              disabled={simulating !== null || !canWrite}
              onClick={() => simulate(s.key)}
              style={{ borderColor: simulating === s.key ? 'var(--border-focus)' : undefined }}
              title={!canWrite ? 'Analyst or Admin required' : `Simulate ${s.label}`}
            >
              {simulating === s.key
                ? <RefreshCw size={12} className="spin" />
                : <span className={`badge badge-${s.sev.toLowerCase()}`} style={{ fontSize: '0.6rem', marginRight: '0.2rem' }}>{s.sev}</span>
              }
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {simResult && (
        <div className={`inline-feedback ${simResult.ok ? 'success' : 'error'}`}>
          {simResult.msg}
        </div>
      )}

      {/* Manual ingestion drawer / modal */}
      {showManual && canWrite && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Manual Event Ingestion</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowManual(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="panel-body">
            <form onSubmit={submitManual}>
              <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select
                    className="form-select"
                    value={manual.eventType}
                    onChange={e => setManual(m => ({ ...m, eventType: e.target.value }))}
                  >
                    {TYPE_OPTS.slice(1).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select
                    className="form-select"
                    value={manual.severity}
                    onChange={e => setManual(m => ({ ...m, severity: e.target.value }))}
                  >
                    {['INFO','LOW','MEDIUM','HIGH','CRITICAL'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Source IP</label>
                  <input
                    className="form-input"
                    value={manual.sourceIp}
                    onChange={e => setManual(m => ({ ...m, sourceIp: e.target.value }))}
                    placeholder="e.g. 198.51.100.23 or leave empty for local"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Source System</label>
                  <input
                    className="form-input"
                    value={manual.sourceSystem}
                    onChange={e => setManual(m => ({ ...m, sourceSystem: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Message</label>
                <input
                  className="form-input"
                  value={manual.message}
                  onChange={e => setManual(m => ({ ...m, message: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">Ingest Event</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowManual(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Filter by source IP…"
            value={ipInput}
            onChange={e => setIpInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setIp(ipInput); setPage(0); } }}
          />
        </div>

        <select className="form-select" style={{ width: '140px' }} value={sev} onChange={e => { setSev(e.target.value); setPage(0); }}>
          <option value="">All Severities</option>
          {SEV_OPTS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="form-select" style={{ width: '220px' }} value={type} onChange={e => { setType(e.target.value); setPage(0); }}>
          <option value="">All Event Types</option>
          {TYPE_OPTS.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={() => { setIp(ipInput); setPage(0); }}>
          Apply
        </button>
        {(sev || type || ip) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSev(''); setType(''); setIp(''); setIpInput(''); setPage(0); }}>
            Clear Filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.714rem', color: 'var(--text-muted)' }}>
          {totalElements.toLocaleString()} records
        </span>
      </div>

      {error && <div className="inline-feedback error">{error}</div>}

      {/* Data table */}
      <div className="panel" style={{ padding: 0 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '185px' }}>Timestamp (IST)</th>
                <th style={{ width: '90px' }}>Severity</th>
                <th style={{ width: '200px' }}>Event Type</th>
                <th style={{ width: '130px' }}>Source IP</th>
                <th style={{ width: '140px' }}>Source System</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '14px' }} /></td>
                      ))}
                    </tr>
                  ))
                : logs.length === 0
                  ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state" style={{ padding: '2.5rem' }}>
                          <AlertTriangle size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                          <div className="empty-state-title">No events matched query</div>
                          <div className="empty-state-desc">Try clearing filters or trigger simulated attacks above.</div>
                        </div>
                      </td>
                    </tr>
                  )
                  : logs.map(log => {
                      const isExp = expanded === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            className="clickable"
                            onClick={() => setExpanded(isExp ? null : log.id)}
                            style={{ background: isExp ? 'var(--surface-elevated)' : undefined }}
                          >
                            <td className="col-mono" style={{ fontSize: '0.73rem' }}>{formatIST(log.timestamp)}</td>
                            <td>
                              <span className={`badge badge-${(log.severity || 'low').toLowerCase()}`}>
                                {log.severity}
                              </span>
                            </td>
                            <td className="col-mono" style={{ fontSize: '0.73rem', fontWeight: 500 }}>{log.eventType}</td>
                            <td className="col-mono" style={{ fontSize: '0.73rem' }}>{log.sourceIp || '—'}</td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.sourceSystem || '—'}</td>
                            <td style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>{log.message}</td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={6} style={{ background: 'var(--surface-elevated)', padding: '0.75rem 1rem' }}>
                                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                    <span>Log ID: <strong className="col-mono">{log.id}</strong></span>
                                    <span>Dest IP: <strong className="col-mono">{log.destinationIp || '—'}</strong></span>
                                    <span>Processed: <strong>{log.processed ? 'Yes' : 'Pending'}</strong></span>
                                  </div>
                                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <pre style={{
                                      background: 'var(--surface-base)',
                                      padding: '0.5rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.7rem',
                                      color: 'var(--text-mono)',
                                      overflowX: 'auto',
                                      margin: '0.3rem 0 0 0'
                                    }}>
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
