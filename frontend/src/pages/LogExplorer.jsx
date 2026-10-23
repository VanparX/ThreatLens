import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, Search, RefreshCw, PlusCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';

const SEV_OPTS  = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const TYPE_OPTS = ['', 'BRUTE_FORCE', 'PORT_SCAN', 'RANSOMWARE_DETECTED', 'PRIVILEGE_ESCALATION', 'AUTHENTICATION_FAILURE', 'UNAUTHORIZED_ACCESS'];

function fmtTs(iso) {
  if (!iso) return '–';
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { return iso; }
}

export default function LogExplorer() {
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
    eventType: 'AUTHENTICATION_FAILURE', severity: 'HIGH',
    sourceIp: '192.168.1.100', destinationIp: '10.0.0.1',
    sourceSystem: 'auth-gateway', message: 'Authentication failure for user account'
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
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, sev, type, ip]);

  const simulate = async (kind) => {
    setSimulating(kind); setSimResult(null);
    try {
      const base = { timestamp: new Date().toISOString() };
      if (kind === 'BRUTE_FORCE') {
        const src = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
        for (let i = 0; i < 5; i++) {
          await api.post('/logs', { ...base, sourceIp: src, destinationIp: '10.0.0.5', eventType: 'BRUTE_FORCE', severity: 'HIGH', sourceSystem: 'ssh-bastion-01', message: `SSH authentication failure attempt #${i + 1} for user root`, metadata: { username: 'root', port: 22 } });
        }
        setSimResult({ ok: true, msg: `5 brute-force events injected from ${src}` });
      } else if (kind === 'RANSOMWARE') {
        await api.post('/logs', { ...base, sourceIp: '10.0.4.88', destinationIp: '198.51.100.200', eventType: 'RANSOMWARE_DETECTED', severity: 'CRITICAL', sourceSystem: 'edr-agent-finance', message: 'Mass file encryption detected (.locked extension). Cryptolocker signature match.', metadata: { affectedFiles: 1420 } });
        setSimResult({ ok: true, msg: 'CRITICAL ransomware event injected — check Alerts for automatic dispatch' });
      } else if (kind === 'PORT_SCAN') {
        await api.post('/logs', { ...base, sourceIp: '203.0.113.45', destinationIp: '10.0.0.1', eventType: 'PORT_SCAN', severity: 'MEDIUM', sourceSystem: 'edge-firewall-01', message: 'SYN sweep detected across ports 21, 22, 23, 80, 443, 8080', metadata: {} });
        setSimResult({ ok: true, msg: 'Port scan event injected' });
      } else if (kind === 'PRIV_ESC') {
        await api.post('/logs', { ...base, sourceIp: '10.0.2.14', destinationIp: '10.0.2.14', eventType: 'PRIVILEGE_ESCALATION', severity: 'HIGH', sourceSystem: 'prod-k8s-worker-03', message: 'Unauthorized sudo execution by non-wheel user daemon-svc', metadata: {} });
        setSimResult({ ok: true, msg: 'Privilege escalation event injected' });
      }
      load();
    } catch (err) { setSimResult({ ok: false, msg: err.message }); }
    finally { setSimulating(null); }
  };

  const submitManual = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/logs', { ...manual, timestamp: new Date().toISOString() });
      setSimResult({ ok: true, msg: 'Custom event ingested' });
      setShowManual(false); load();
    } catch (err) { setSimResult({ ok: false, msg: err.message }); setLoading(false); }
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
          <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(s => !s)}>
            <PlusCircle size={13} /> {showManual ? 'Close' : 'Manual ingest'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Simulator panel — clearly labeled as simulation */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={14} style={{ color: 'var(--sev-high)' }} />
            <span className="panel-title">Attack Event Simulator</span>
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Simulation only — does not trigger real actions</span>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SIMS.map(s => (
            <button
              key={s.key}
              className={`btn btn-secondary btn-sm`}
              disabled={simulating !== null}
              onClick={() => simulate(s.key)}
              style={{ borderColor: simulating === s.key ? 'var(--border-focus)' : undefined }}
            >
              {simulating === s.key
                ? <RefreshCw size={12} className="spin" />
                : <span className={`badge badge-${s.sev.toLowerCase()}`} style={{ fontSize: '0.6rem', marginRight: '0.2rem' }}>{s.sev}</span>
              }
              {s.label}
            </button>
          ))}
        </div>
        {simResult && (
          <div className={`inline-feedback ${simResult.ok ? 'success' : 'error'}`} style={{ margin: '0 1rem 0.75rem' }}>
            {simResult.msg}
          </div>
        )}
      </div>

      {/* Manual Ingest Form */}
      {showManual && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Manual Event Ingest</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowManual(false)} aria-label="Close"><X size={14} /></button>
          </div>
          <div className="panel-body">
            <form onSubmit={submitManual}>
              <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select className="form-select" value={manual.eventType} onChange={e => setManual(m => ({ ...m, eventType: e.target.value }))}>
                    {['AUTHENTICATION_FAILURE','BRUTE_FORCE','PORT_SCAN','RANSOMWARE_DETECTED','PRIVILEGE_ESCALATION','UNAUTHORIZED_ACCESS'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select className="form-select" value={manual.severity} onChange={e => setManual(m => ({ ...m, severity: e.target.value }))}>
                    {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Source IP</label>
                  <input className="form-input" value={manual.sourceIp} onChange={e => setManual(m => ({ ...m, sourceIp: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Source System</label>
                  <input className="form-input" value={manual.sourceSystem} onChange={e => setManual(m => ({ ...m, sourceSystem: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Message</label>
                <input className="form-input" value={manual.message} onChange={e => setManual(m => ({ ...m, message: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">Ingest event</button>
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
        <select className="form-select" style={{ width: '145px' }} value={sev} onChange={e => { setSev(e.target.value); setPage(0); }}>
          <option value="">All severities</option>
          {SEV_OPTS.slice(1).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: '195px' }} value={type} onChange={e => { setType(e.target.value); setPage(0); }}>
          <option value="">All event types</option>
          {TYPE_OPTS.slice(1).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        {(sev || type || ip) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSev(''); setType(''); setIp(''); setIpInput(''); setPage(0); }}>
            <X size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.714rem', color: 'var(--text-muted)' }}>
          {totalElements.toLocaleString()} events
        </span>
      </div>

      {/* Log table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {error && (
          <div className="inline-feedback error" style={{ margin: '0.75rem' }}>{error}</div>
        )}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '155px' }}>Timestamp</th>
                <th style={{ width: '80px' }}>Severity</th>
                <th>Event type</th>
                <th>Source IP</th>
                <th>Destination IP</th>
                <th>System</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '14px' }} /></td>
                      ))}
                    </tr>
                  ))
                : logs.length === 0
                  ? <tr><td colSpan={7} className="empty-state" style={{ padding: '2.5rem', textAlign: 'center' }}>No events found. Use the simulator above to generate test events.</td></tr>
                  : logs.map(log => (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          style={{ cursor: 'pointer' }}
                          title="Click to expand"
                        >
                          <td className="col-mono col-dim">{fmtTs(log.timestamp)}</td>
                          <td><span className={`badge badge-${(log.severity || 'low').toLowerCase()}`}>{log.severity}</span></td>
                          <td className="col-mono" style={{ fontSize: '0.75rem' }}>{log.eventType}</td>
                          <td className="col-mono" style={{ color: 'var(--text-primary)' }}>{log.sourceIp || '–'}</td>
                          <td className="col-mono col-dim">{log.destinationIp || '–'}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{log.sourceSystem || '–'}</td>
                          <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={log.message}>{log.message}</td>
                        </tr>
                        {expanded === log.id && (
                          <tr>
                            <td colSpan={7} style={{ background: 'var(--surface-elevated)', padding: '0.75rem 1rem' }}>
                              <div className="log-message">{log.message}</div>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  {Object.entries(log.metadata).map(([k, v]) => (
                                    <span key={k} style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{k}:</span> <span className="col-mono">{String(v)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-nav)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="page-info">Page {page + 1} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
