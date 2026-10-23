import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';

function fmtTs(iso) {
  if (!iso) return '–';
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { return iso; }
}

export default function AuditLogs() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [actorInput, setActorInput]   = useState('');
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, size: 30 };
      if (actorFilter) params.actor = actorFilter;
      const res = await api.get('/audit', { params });
      const d = res?.data ?? res;
      setLogs(d.content ?? []);
      setTotalPages(d.totalPages ?? 0);
      setTotalElements(d.totalElements ?? 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, actorFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Immutable record of all analyst actions, rule changes, and system operations.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Filter by actor username…"
            value={actorInput}
            onChange={e => setActorInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setActorFilter(actorInput); setPage(0); } }}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { setActorFilter(actorInput); setPage(0); }}>
          Apply
        </button>
        {actorFilter && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setActorFilter(''); setActorInput(''); setPage(0); }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.714rem', color: 'var(--text-muted)' }}>
          {totalElements.toLocaleString()} records
        </span>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Timestamp</th>
                <th style={{ width: '110px' }}>Actor</th>
                <th style={{ width: '160px' }}>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '14px' }} /></td>
                      ))}
                    </tr>
                  ))
                : logs.length === 0
                  ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state" style={{ padding: '2.5rem' }}>
                          <div className="empty-state-title">No audit records yet</div>
                          <div className="empty-state-text">All analyst actions (acknowledging alerts, creating rules, etc.) will appear here.</div>
                        </div>
                      </td>
                    </tr>
                  )
                  : logs.map(log => (
                    <tr key={log.id}>
                      <td className="col-mono col-dim">{fmtTs(log.timestamp)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{log.actor || 'SYSTEM'}</td>
                      <td>
                        <span className="badge badge-accent" style={{ fontSize: '0.64rem' }}>{log.action}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.814rem' }}>
                        <span style={{ fontWeight: 500 }}>{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="col-mono col-dim" style={{ marginLeft: '0.4rem', fontSize: '0.714rem' }}>
                            #{log.resourceId.substring(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="col-mono col-dim" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details ? JSON.stringify(log.details) : ''}>
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

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
