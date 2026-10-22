import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Shield,
  Clock,
  User,
  Database
} from 'lucide-react';
import api from '../api/client';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = { page, size: 30 };
      if (actorFilter) params.actor = actorFilter;
      const res = await api.get('/audit', { params });
      setLogs(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText color="var(--neon-cyan)" size={24} />
            <span>Immutable SOC Operator Audit Trail</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Cryptographically tracked audit history recording all analyst actions, rule overrides, and containment operations.
          </p>
        </div>

        <button onClick={fetchAuditLogs} disabled={loading} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, maxWidth: '350px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter by operator username (e.g. admin)..."
            className="soc-input"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchAuditLogs(); } }}
            style={{ fontSize: '0.78rem' }}
          />
        </div>
        <button onClick={() => { setPage(0); fetchAuditLogs(); }} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
          Search
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="soc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Action Executed</th>
                <th style={{ padding: '0.75rem 1rem' }}>Target Resource</th>
                <th style={{ padding: '0.75rem 1rem' }}>Audit Parameters & State</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No audit logs recorded yet. All actions like acknowledging alerts or creating rules will appear here!
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: '#fff' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={13} color="var(--neon-cyan)" />
                        {log.actor || 'SYSTEM'}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(0, 240, 255, 0.1)',
                        color: 'var(--neon-cyan)',
                        border: '1px solid rgba(0, 240, 255, 0.2)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{log.resourceType}</span>
                      {log.resourceId && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                          #{log.resourceId.substring(0, 8)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
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
