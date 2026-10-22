import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Filter,
  Play,
  Flame,
  ShieldAlert,
  Search,
  RefreshCw,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';

export default function LogExplorer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual Form State
  const [manualLog, setManualLog] = useState({
    eventType: 'AUTHENTICATION_FAILURE',
    severity: 'HIGH',
    sourceIp: '192.168.1.185',
    destinationIp: '10.0.0.1',
    sourceSystem: 'auth-gateway-primary',
    message: 'Repeated authentication failure detected for administrative user account'
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page, size: 20 };
      if (severityFilter) params.severity = severityFilter;
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (ipFilter) params.sourceIp = ipFilter;

      const res = await api.get('/logs', { params });
      setLogs(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, severityFilter, eventTypeFilter]);

  // Attack Simulators
  const triggerSimulation = async (type) => {
    setSimulating(true);
    setSimFeedback(null);
    try {
      if (type === 'BRUTE_FORCE') {
        const attackerIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
        for (let i = 0; i < 5; i++) {
          await api.post('/logs', {
            timestamp: new Date().toISOString(),
            sourceIp: attackerIp,
            destinationIp: '10.0.0.5',
            eventType: 'BRUTE_FORCE',
            severity: 'HIGH',
            sourceSystem: 'ssh-bastion-node-01',
            message: `SSH authentication failure attempt #${i + 1} for user root`,
            metadata: { username: 'root', port: 22 }
          });
        }
        setSimFeedback({ type: 'success', text: `Dispatched 5 Brute Force events from ${attackerIp}. Rule Engine triggered!` });
      } else if (type === 'RANSOMWARE') {
        const hostIp = '10.0.4.88';
        await api.post('/logs', {
          timestamp: new Date().toISOString(),
          sourceIp: hostIp,
          destinationIp: '198.51.100.200',
          eventType: 'RANSOMWARE_DETECTED',
          severity: 'CRITICAL',
          sourceSystem: 'edr-agent-finance-srv',
          message: 'Mass file encryption detected with extension .locked. Cryptolocker signature match!',
          metadata: { affectedFiles: 1420, signature: 'WannaCry.Variant.X' }
        });
        setSimFeedback({ type: 'danger', text: `CRITICAL Ransomware log dispatched! Emergency Alert & SMS/Email notification triggered!` });
      } else if (type === 'PORT_SCAN') {
        const scannerIp = '203.0.113.45';
        await api.post('/logs', {
          timestamp: new Date().toISOString(),
          sourceIp: scannerIp,
          destinationIp: '10.0.0.1',
          eventType: 'PORT_SCAN',
          severity: 'MEDIUM',
          sourceSystem: 'edge-firewall-01',
          message: 'SYN packet sweep detected scanning ports 21, 22, 23, 80, 443, 8080',
          metadata: { scannedPorts: [21, 22, 23, 80, 443, 8080] }
        });
        setSimFeedback({ type: 'success', text: `Reconnaissance Port Scan log dispatched from ${scannerIp}.` });
      } else if (type === 'PRIVILEGE') {
        await api.post('/logs', {
          timestamp: new Date().toISOString(),
          sourceIp: '10.0.2.14',
          destinationIp: '10.0.2.14',
          eventType: 'PRIVILEGE_ESCALATION',
          severity: 'HIGH',
          sourceSystem: 'prod-k8s-worker-03',
          message: 'Unauthorized sudo execution by non-wheel user daemon-svc without ticket approval',
          metadata: { user: 'daemon-svc', command: '/usr/bin/sudo -i' }
        });
        setSimFeedback({ type: 'success', text: `Privilege Escalation event injected.` });
      }
      fetchLogs();
    } catch (err) {
      setSimFeedback({ type: 'danger', text: `Simulation error: ${err.message}` });
    } finally {
      setSimulating(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/logs', {
        ...manualLog,
        timestamp: new Date().toISOString()
      });
      setShowManualForm(false);
      setSimFeedback({ type: 'success', text: 'Custom security event log successfully ingested.' });
      fetchLogs();
    } catch (err) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Terminal color="var(--neon-cyan)" size={24} />
            <span>Real-Time Log Stream & Attack Simulator</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            High-throughput SIEM log collector with interactive adversary simulation presets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <PlusCircle size={15} />
            <span>{showManualForm ? 'Close Form' : 'Manual Ingest'}</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Cyber Attack Simulation Hub */}
      <div className="soc-card" style={{ background: 'var(--simulator-card-bg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={18} color="var(--neon-rose)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Adversary Attack Simulator</h3>
            <span style={{ fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--neon-rose)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              Live SIEM Testing
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Inject test vectors to observe automated detection rules & alert routing
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => triggerSimulation('BRUTE_FORCE')}
            disabled={simulating}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem' }}
          >
            <Play size={13} />
            <span>Simulate SSH Brute Force (5x Auth Fail)</span>
          </button>

          <button
            onClick={() => triggerSimulation('RANSOMWARE')}
            disabled={simulating}
            className="btn btn-danger"
            style={{ fontSize: '0.78rem' }}
          >
            <AlertTriangle size={13} />
            <span>Simulate Ransomware Beacon (CRITICAL)</span>
          </button>

          <button
            onClick={() => triggerSimulation('PORT_SCAN')}
            disabled={simulating}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem' }}
          >
            <Play size={13} />
            <span>Simulate Network Port Sweep</span>
          </button>

          <button
            onClick={() => triggerSimulation('PRIVILEGE')}
            disabled={simulating}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem' }}
          >
            <Play size={13} />
            <span>Simulate Privilege Escalation</span>
          </button>
        </div>

        {simFeedback && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            background: simFeedback.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: simFeedback.type === 'danger' ? 'var(--neon-rose)' : 'var(--neon-emerald)',
            border: `1px solid ${simFeedback.type === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span className={simFeedback.type === 'danger' ? 'pulse-indicator-danger' : 'pulse-indicator'} />
            <span>{simFeedback.text}</span>
          </div>
        )}
      </div>

      {/* Manual Ingestion Form Drawer */}
      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="soc-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Event Type</label>
            <select
              className="soc-input"
              value={manualLog.eventType}
              onChange={(e) => setManualLog({ ...manualLog, eventType: e.target.value })}
            >
              <option value="AUTHENTICATION_FAILURE">AUTHENTICATION_FAILURE</option>
              <option value="BRUTE_FORCE">BRUTE_FORCE</option>
              <option value="PORT_SCAN">PORT_SCAN</option>
              <option value="RANSOMWARE_DETECTED">RANSOMWARE_DETECTED</option>
              <option value="PRIVILEGE_ESCALATION">PRIVILEGE_ESCALATION</option>
              <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Severity</label>
            <select
              className="soc-input"
              value={manualLog.severity}
              onChange={(e) => setManualLog({ ...manualLog, severity: e.target.value })}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Source IP</label>
            <input
              type="text"
              className="soc-input"
              value={manualLog.sourceIp}
              onChange={(e) => setManualLog({ ...manualLog, sourceIp: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Source System</label>
            <input
              type="text"
              className="soc-input"
              value={manualLog.sourceSystem}
              onChange={(e) => setManualLog({ ...manualLog, sourceSystem: e.target.value })}
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Log Message / Payload</label>
            <input
              type="text"
              className="soc-input"
              value={manualLog.message}
              onChange={(e) => setManualLog({ ...manualLog, message: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              Submit Ingestion
            </button>
            <button type="button" onClick={() => setShowManualForm(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Filter size={15} />
          <span>Filters:</span>
        </div>

        <select
          className="soc-input"
          style={{ width: '150px', padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        <select
          className="soc-input"
          style={{ width: '180px', padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
          value={eventTypeFilter}
          onChange={(e) => { setEventTypeFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Event Types</option>
          <option value="BRUTE_FORCE">BRUTE_FORCE</option>
          <option value="PORT_SCAN">PORT_SCAN</option>
          <option value="RANSOMWARE_DETECTED">RANSOMWARE_DETECTED</option>
          <option value="PRIVILEGE_ESCALATION">PRIVILEGE_ESCALATION</option>
          <option value="AUTHENTICATION_FAILURE">AUTHENTICATION_FAILURE</option>
          <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by source IP..."
            className="soc-input"
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchLogs(); } }}
          />
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="soc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Event Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Source IP</th>
                <th style={{ padding: '0.75rem 1rem' }}>Destination</th>
                <th style={{ padding: '0.75rem 1rem' }}>System</th>
                <th style={{ padding: '0.75rem 1rem' }}>Payload / Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No logs found matching filter criteria. Use the Attack Simulator above to ingest telemetry!
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color-subtle)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <span className={`badge badge-${(log.severity || 'low').toLowerCase()}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.eventType}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
                      {log.sourceIp || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {log.destinationIp || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)' }}>
                      {log.sourceSystem}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: 'var(--text-primary)', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
