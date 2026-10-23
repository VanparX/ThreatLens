import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Check, UserCheck, Flame, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtTs(iso) {
  if (!iso) return '–';
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return iso; }
}

const STATUS_OPTS = ['', 'OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED', 'CLOSED'];

export default function AlertCenter({ onNavigate }) {
  const { user } = useAuth();
  const [alerts, setAlerts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [feedback, setFeedback]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page: 0, size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/alerts', { params });
      const d = res?.data ?? res;
      setAlerts(d.content ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const acknowledge = async (id) => {
    setActionLoading(true);
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      showFeedback('success', 'Alert acknowledged');
      load();
      if (selected?.id === id) setSelected(s => ({ ...s, status: 'ACKNOWLEDGED' }));
    } catch (err) { showFeedback('error', err.message); }
    finally { setActionLoading(false); }
  };

  const assign = async (id) => {
    setActionLoading(true);
    try {
      await api.patch(`/alerts/${id}/assign`, { assignedTo: user?.username || 'admin' });
      showFeedback('success', `Assigned to ${user?.username || 'admin'}`);
      load();
      if (selected?.id === id) setSelected(s => ({ ...s, status: 'ASSIGNED', assignedTo: user?.username }));
    } catch (err) { showFeedback('error', err.message); }
    finally { setActionLoading(false); }
  };

  const resolve = async (id) => {
    setActionLoading(true);
    try {
      await api.patch(`/alerts/${id}/resolve`, { status: 'RESOLVED', resolutionNote: resolveNote || 'Resolved by analyst' });
      showFeedback('success', 'Alert resolved');
      setResolveNote('');
      load();
      if (selected?.id === id) setSelected(s => ({ ...s, status: 'RESOLVED' }));
    } catch (err) { showFeedback('error', err.message); }
    finally { setActionLoading(false); }
  };

  const grouped = {
    open: alerts.filter(a => a.status === 'OPEN'),
    inProgress: alerts.filter(a => ['ACKNOWLEDGED','ASSIGNED'].includes(a.status)),
    closed: alerts.filter(a => ['RESOLVED','CLOSED'].includes(a.status)),
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px - 3rem)', gap: '1rem', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Detections &amp; Alerts</h1>
          <p className="page-subtitle">Investigate threat detections, assign analysts, and track resolution.</p>
        </div>
        <div className="page-actions">
          <select className="form-select" style={{ width: '155px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTS.slice(1).map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>
      )}

      {/* Split view */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Alert list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {loading ? (
            <div className="panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '60px' }} />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="panel empty-state" style={{ flex: 1 }}>
              <CheckCircle size={36} style={{ color: 'var(--sev-low)', opacity: 0.6 }} />
              <div className="empty-state-title">No alerts found</div>
              <div className="empty-state-text">No alerts match the current filter. Generate events using the Log Simulator to trigger detections.</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => onNavigate('logs')}>Open Simulator</button>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Severity</th>
                      <th>Title</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th style={{ width: '130px' }}>Created</th>
                      <th style={{ width: '100px' }}>Assigned to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map(a => {
                      const isSel = selected?.id === a.id;
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelected(a)}
                          style={{ cursor: 'pointer', background: isSel ? 'var(--accent-subtle)' : undefined }}
                        >
                          <td><span className={`badge badge-${(a.severity || 'low').toLowerCase()}`}>{a.severity}</span></td>
                          <td style={{ fontWeight: isSel ? 600 : 500, color: 'var(--text-primary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.title}>{a.title}</td>
                          <td><span className={`status-pill ${(a.status || '').toLowerCase()}`}>{a.status}</span></td>
                          <td className="col-mono col-dim">{fmtTs(a.createdAt)}</td>
                          <td style={{ fontSize: '0.786rem', color: 'var(--text-muted)' }}>{a.assignedTo || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail pane */}
        {selected && (
          <div className="detail-drawer">
            <div className="detail-drawer-header">
              <span className="t-section">Alert detail</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)} aria-label="Close detail">
                <X size={14} />
              </button>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className={`badge badge-${(selected.severity || 'low').toLowerCase()}`}>{selected.severity}</span>
                <span className={`status-pill ${(selected.status || '').toLowerCase()}`}>{selected.status}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{selected.title}</div>
              <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.description}</div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Metadata</div>
              <div className="detail-row"><span className="detail-key">Alert ID</span><span className="detail-val col-mono">{selected.id}</span></div>
              <div className="detail-row"><span className="detail-key">Created</span><span className="detail-val col-mono">{fmtTs(selected.createdAt)}</span></div>
              <div className="detail-row"><span className="detail-key">Updated</span><span className="detail-val col-mono">{fmtTs(selected.updatedAt) || '–'}</span></div>
              <div className="detail-row"><span className="detail-key">Assigned to</span><span className="detail-val">{selected.assignedTo || 'Unassigned'}</span></div>
              <div className="detail-row"><span className="detail-key">Acknowledged</span><span className="detail-val">{selected.acknowledgedBy || '—'}</span></div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selected.status === 'OPEN' && (
                  <button className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={() => acknowledge(selected.id)}>
                    <Check size={13} /> Acknowledge
                  </button>
                )}
                {!selected.assignedTo && (
                  <button className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={() => assign(selected.id)}>
                    <UserCheck size={13} /> Assign to me
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('incidents')}>
                  <Flame size={13} /> Open incident case
                </button>
              </div>
            </div>

            {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
              <div className="detail-section">
                <div className="detail-section-title">Resolve</div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Remediation notes…"
                  value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  style={{ marginBottom: '0.5rem', resize: 'vertical' }}
                />
                <button className="btn btn-primary btn-sm" disabled={actionLoading} onClick={() => resolve(selected.id)}>
                  <CheckCircle size={13} /> Mark resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
