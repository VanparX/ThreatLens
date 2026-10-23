import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, X, Flame, Shield, Lock, Ban, Key, Send, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtTs(iso) {
  if (!iso) return '–';
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return iso; }
}

const STATUS_FLOW = ['NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'];

export default function IncidentResponse() {
  const { user } = useAuth();
  const [incidents, setIncidents]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]         = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreate, setShowCreate]     = useState(false);
  const [feedback, setFeedback]         = useState(null);
  const [noteText, setNoteText]         = useState('');
  const [newInc, setNewInc]             = useState({ title: '', description: '', severity: 'HIGH', assignedTo: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = { page: 0, size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/incidents', { params });
      const d = res?.data ?? res;
      const items = d.content ?? [];
      setIncidents(items);
      if (selected) {
        const upd = items.find(i => i.id === selected.id);
        if (upd) setSelected(upd);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const create = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await api.post('/incidents', { ...newInc, assignedTo: newInc.assignedTo || user?.username || 'admin' });
      setShowCreate(false);
      setNewInc({ title: '', description: '', severity: 'HIGH', assignedTo: '' });
      toast('success', 'Incident case opened');
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const changeStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await api.put(`/incidents/${id}/status?status=${status}`);
      toast('success', `Status → ${status}`);
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selected) return;
    setActionLoading(true);
    try {
      await api.post(`/incidents/${selected.id}/notes`, { note: noteText });
      setNoteText('');
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const executeAction = async (actionType, target, description) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.post(`/incidents/${selected.id}/actions`, { actionType, target, description });
      toast('success', `${actionType} executed against ${target}`);
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const CONTAINMENT = [
    { key: 'IP_BLOCK',            label: 'Block IP',         icon: Ban,  target: '198.51.100.200', desc: 'Firewall drop rule: quarantine host from ingress' },
    { key: 'USER_LOCK',           label: 'Lock account',     icon: Lock, target: 'compromised-account', desc: 'IDP: lock credentials and invalidate sessions' },
    { key: 'CREDENTIAL_REVOCATION', label: 'Revoke tokens', icon: Key,  target: 'api-key-root', desc: 'Revoke compromised API tokens and JWT keys' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 52px - 3rem)' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Incident Response</h1>
          <p className="page-subtitle">Manage escalated security incidents, containment actions, and analyst timelines.</p>
        </div>
        <div className="page-actions">
          <select className="form-select" style={{ width: '155px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New incident
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>}

      {/* Split view */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Incident list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '72px' }} />)}
            </div>
          ) : incidents.length === 0 ? (
            <div className="panel empty-state" style={{ flex: 1 }}>
              <Shield size={36} style={{ color: 'var(--sev-low)', opacity: 0.5 }} />
              <div className="empty-state-title">No incidents on record</div>
              <div className="empty-state-text">Create a new incident case or escalate an alert from the Detections page.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setShowCreate(true)}>
                <Plus size={13} /> Open incident
              </button>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0 }}>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Severity</th>
                      <th>Title</th>
                      <th style={{ width: '120px' }}>Status</th>
                      <th style={{ width: '100px' }}>Assigned to</th>
                      <th style={{ width: '130px' }}>Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(inc => {
                      const isSel = selected?.id === inc.id;
                      return (
                        <tr key={inc.id} onClick={() => setSelected(inc)} style={{ cursor: 'pointer', background: isSel ? 'var(--sev-critical-bg)' : undefined }}>
                          <td><span className={`badge badge-${(inc.severity || 'high').toLowerCase()}`}>{inc.severity}</span></td>
                          <td style={{ fontWeight: isSel ? 600 : 500, color: 'var(--text-primary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inc.title}>{inc.title}</td>
                          <td><span className={`status-pill ${(inc.status || '').toLowerCase()}`}>{inc.status}</span></td>
                          <td style={{ fontSize: '0.786rem', color: 'var(--text-muted)' }}>{inc.assignedTo || '—'}</td>
                          <td className="col-mono col-dim">{fmtTs(inc.createdAt)}</td>
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
          <div className="detail-drawer" style={{ width: '440px' }}>
            <div className="detail-drawer-header">
              <div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge badge-${(selected.severity || 'high').toLowerCase()}`}>{selected.severity}</span>
                  <span className={`status-pill ${(selected.status || '').toLowerCase()}`}>{selected.status}</span>
                </div>
                <div style={{ fontSize: '0.857rem', fontWeight: 600, marginTop: '0.3rem', color: 'var(--text-primary)' }}>{selected.title}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>

            {/* Status progression */}
            <div className="detail-section">
              <div className="detail-section-title">Lifecycle status</div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {STATUS_FLOW.map(st => (
                  <button
                    key={st}
                    className={`btn btn-sm ${selected.status === st ? 'btn-primary' : 'btn-ghost'}`}
                    disabled={actionLoading || selected.status === st}
                    onClick={() => changeStatus(selected.id, st)}
                    style={{ fontSize: '0.714rem' }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="detail-section">
              <div className="detail-section-title">Details</div>
              <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>{selected.description}</div>
              <div className="detail-row"><span className="detail-key">Assigned to</span><span className="detail-val">{selected.assignedTo || '—'}</span></div>
              <div className="detail-row"><span className="detail-key">Opened</span><span className="detail-val col-mono">{fmtTs(selected.createdAt)}</span></div>
            </div>

            {/* Containment */}
            <div className="detail-section">
              <div className="detail-section-title">Containment actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {CONTAINMENT.map(c => (
                  <button
                    key={c.key}
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading}
                    onClick={() => executeAction(c.key, c.target, c.desc)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <c.icon size={12} /> {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Response actions history */}
            {selected.responseActions?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Action log ({selected.responseActions.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {selected.responseActions.map((a, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', background: 'var(--surface-elevated)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--sev-low)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.actionType} → {a.target}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.1rem' }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add note */}
            <div className="detail-section">
              <div className="detail-section-title">Add timeline note</div>
              <form onSubmit={addNote} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Analyst note…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading || !noteText.trim()}>
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Open Incident Case</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={14} /></button>
            </div>
            <form onSubmit={create}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" placeholder="e.g. SSH credential stuffing attack" value={newInc.title} onChange={e => setNewInc(n => ({ ...n, title: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select className="form-select" value={newInc.severity} onChange={e => setNewInc(n => ({ ...n, severity: e.target.value }))}>
                      {['CRITICAL','HIGH','MEDIUM','LOW'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned to</label>
                    <input className="form-input" placeholder={user?.username || 'analyst'} value={newInc.assignedTo} onChange={e => setNewInc(n => ({ ...n, assignedTo: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} placeholder="Scope, affected systems, initial findings…" value={newInc.description} onChange={e => setNewInc(n => ({ ...n, description: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>Open case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
