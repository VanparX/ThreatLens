import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, X, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/client';

const BLANK_RULE = {
  name: '', description: '', type: 'EVENT_TYPE_MATCH', severity: 'HIGH', enabled: true,
  condition: { eventTypes: ['AUTHENTICATION_FAILURE'], thresholdCount: 3, thresholdWindowSeconds: 60 }
};

export default function RulesManager() {
  const [rules, setRules]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [feedback, setFeedback]       = useState(null);
  const [newRule, setNewRule]         = useState(BLANK_RULE);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rules?page=0&size=50');
      const d = res?.data ?? res;
      setRules(d.content ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggle = async (id, enabled) => {
    setActionLoading(true);
    try {
      await api.put(`/rules/${id}/${enabled ? 'disable' : 'enable'}`);
      toast('success', `Rule ${enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const create = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await api.post('/rules', newRule);
      setShowCreate(false);
      setNewRule(BLANK_RULE);
      toast('success', 'Detection rule deployed');
      load();
    } catch (err) { toast('error', err.message); }
    finally { setActionLoading(false); }
  };

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Detection Rules</h1>
          <p className="page-subtitle">Configure correlation rules that evaluate incoming events and trigger alerts.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New rule
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>}

      {/* Summary strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total rules</div>
          <div className="kpi-value">{rules.length}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Active</div>
          <div className="kpi-value healthy">{activeCount}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Disabled</div>
          <div className="kpi-value">{rules.length - activeCount}</div>
        </div>
      </div>

      {/* Rules table */}
      <div className="panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '44px' }} />)}
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="empty-state-title">No rules configured</div>
            <div className="empty-state-text">Create your first detection rule to start correlating security events.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create first rule
            </button>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Severity</th>
                  <th>Rule name</th>
                  <th>Type</th>
                  <th>Condition</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.55 }}>
                    <td><span className={`badge badge-${(rule.severity || 'high').toLowerCase()}`}>{rule.severity}</span></td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{rule.name}</div>
                      {rule.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rule.description}</div>}
                    </td>
                    <td className="col-mono" style={{ fontSize: '0.75rem' }}>{rule.type}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
                      {rule.condition?.eventTypes?.join(', ')}
                      {rule.condition?.thresholdCount && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>≥{rule.condition.thresholdCount} in {rule.condition.thresholdWindowSeconds}s</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${rule.enabled ? 'enabled' : 'disabled'}`}>
                        {rule.enabled ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${rule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={actionLoading}
                        onClick={() => toggle(rule.id, rule.enabled)}
                      >
                        {rule.enabled ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Detection Rule</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={14} /></button>
            </div>
            <form onSubmit={create}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Rule name</label>
                  <input className="form-input" placeholder="e.g. Credential stuffing detection" value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="Explain what this rule detects…" value={newRule.description} onChange={e => setNewRule(r => ({ ...r, description: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rule type</label>
                    <select className="form-select" value={newRule.type} onChange={e => setNewRule(r => ({ ...r, type: e.target.value }))}>
                      {['EVENT_TYPE_MATCH','THRESHOLD','PATTERN_MATCH'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select className="form-select" value={newRule.severity} onChange={e => setNewRule(r => ({ ...r, severity: e.target.value }))}>
                      {['CRITICAL','HIGH','MEDIUM','LOW'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Target event type</label>
                  <select className="form-select" value={newRule.condition.eventTypes[0]} onChange={e => setNewRule(r => ({ ...r, condition: { ...r.condition, eventTypes: [e.target.value] } }))}>
                    {['AUTHENTICATION_FAILURE','BRUTE_FORCE','PORT_SCAN','RANSOMWARE_DETECTED','PRIVILEGE_ESCALATION','UNAUTHORIZED_ACCESS'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {newRule.type === 'THRESHOLD' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Threshold count</label>
                      <input type="number" min={1} className="form-input" value={newRule.condition.thresholdCount} onChange={e => setNewRule(r => ({ ...r, condition: { ...r.condition, thresholdCount: parseInt(e.target.value) || 1 } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Window (seconds)</label>
                      <input type="number" min={5} className="form-input" value={newRule.condition.thresholdWindowSeconds} onChange={e => setNewRule(r => ({ ...r, condition: { ...r.condition, thresholdWindowSeconds: parseInt(e.target.value) || 60 } }))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>Deploy rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
