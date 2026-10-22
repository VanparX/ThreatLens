import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldAlert,
  Shield,
  Plus,
  Lock,
  Ban,
  Key,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  Send
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function IncidentResponse() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Note state
  const [noteText, setNoteText] = useState('');

  // Create Form State
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    assignedTo: ''
  });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = { page: 0, size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/incidents', { params });
      const items = res.data.content || [];
      setIncidents(items);
      if (selectedIncident) {
        const updated = items.find((i) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/incidents', {
        ...newIncident,
        assignedTo: newIncident.assignedTo || user?.username || 'admin'
      });
      setShowCreateModal(false);
      setNewIncident({ title: '', description: '', severity: 'HIGH', assignedTo: '' });
      setFeedback({ type: 'success', text: 'New incident response case opened.' });
      fetchIncidents();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setActionLoading(true);
      await api.put(`/incidents/${id}/status?status=${newStatus}`);
      setFeedback({ type: 'success', text: `Incident status updated to ${newStatus}.` });
      fetchIncidents();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedIncident) return;
    try {
      setActionLoading(true);
      await api.post(`/incidents/${selectedIncident.id}/notes`, { note: noteText });
      setNoteText('');
      fetchIncidents();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteContainment = async (actionType, target, description) => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      await api.post(`/incidents/${selectedIncident.id}/actions`, {
        actionType,
        target,
        description
      });
      setFeedback({ type: 'success', text: `Containment playbook [${actionType}] executed successfully against ${target}.` });
      fetchIncidents();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Flame color="var(--neon-rose)" size={24} />
            <span>Incident Response & Containment Command</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Orchestrated cyber incident escalation, MITRE ATT&CK mitigation, and active containment playbooks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Plus size={15} />
            <span>Open Incident Case</span>
          </button>
          <button onClick={fetchIncidents} disabled={loading} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          background: feedback.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: feedback.type === 'danger' ? 'var(--neon-rose)' : 'var(--neon-emerald)',
          border: `1px solid ${feedback.type === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>
          {feedback.text}
        </div>
      )}

      {/* Main Split: Incident List & Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedIncident ? '1fr 1.3fr' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Incident List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {incidents.length === 0 ? (
            <div className="soc-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No incidents on record. Open a new incident case or escalate an existing Alert to start containment.
            </div>
          ) : (
            incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="soc-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--neon-rose)' : 'var(--border-color)',
                    background: isSelected ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge badge-${(inc.severity || 'high').toLowerCase()}`}>
                        {inc.severity}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        CASE #{inc.id?.substring(0, 8)}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: inc.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: inc.status === 'RESOLVED' ? 'var(--neon-emerald)' : 'var(--neon-rose)'
                    }}>
                      {inc.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {inc.title}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                    {inc.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={12} /> {inc.assignedTo || 'Unassigned'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Incident Active Command Workspace */}
        {selectedIncident && (
          <div className="soc-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className={`badge badge-${(selectedIncident.severity || 'high').toLowerCase()}`}>
                    {selectedIncident.severity}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    CASE #{selectedIncident.id}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                  {selectedIncident.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Lifecycle Status Stepper */}
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Incident Lifecycle Progression
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedIncident.id, st)}
                    disabled={actionLoading}
                    className="btn"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.35rem 0.65rem',
                      background: selectedIncident.status === st ? 'rgba(0, 240, 255, 0.2)' : 'var(--bg-secondary)',
                      color: selectedIncident.status === st ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      border: selectedIncident.status === st ? '1px solid var(--neon-cyan)' : '1px solid var(--border-color)'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Automated Containment Playbook Actions */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <Shield size={16} color="var(--neon-rose)" />
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Automated Containment Playbooks
                </h4>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Execute active mitigations directly via edge firewall and identity providers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
                <button
                  onClick={() => handleExecuteContainment('IP_BLOCK', '198.51.100.200', 'Edge Firewall Drop Rule: Quarantine host from external ingress')}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ fontSize: '0.74rem' }}
                >
                  <Ban size={13} />
                  <span>Quarantine & Drop IP</span>
                </button>

                <button
                  onClick={() => handleExecuteContainment('USER_LOCK', 'compromised-account', 'Identity Provider: Lock active credentials and invalidate session tokens')}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ fontSize: '0.74rem' }}
                >
                  <Lock size={13} />
                  <span>Lock Target Account</span>
                </button>

                <button
                  onClick={() => handleExecuteContainment('CREDENTIAL_REVOCATION', 'api-key-root', 'Secret Vault: Force revoke compromised API tokens & JWT keys')}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem' }}
                >
                  <Key size={13} />
                  <span>Revoke Session Keys</span>
                </button>
              </div>
            </div>

            {/* Action History & Notes Log */}
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Response Actions Executed ({selectedIncident.responseActions?.length || 0})
              </span>
              {(!selectedIncident.responseActions || selectedIncident.responseActions.length === 0) ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  No containment actions executed yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {selectedIncident.responseActions.map((act, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', borderLeft: '3px solid var(--neon-emerald)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{act.actionType} → {act.target}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{act.executedBy || 'SOAR'}</span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                        {act.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Analyst Investigation Note */}
            <div>
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Add analyst investigation note or timeline artifact..."
                  className="soc-input"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                />
                <button type="submit" disabled={actionLoading || !noteText.trim()} className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  <Send size={13} />
                  <span>Log Note</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Open New Incident Case */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="soc-card" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--neon-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={20} color="var(--neon-rose)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Open Incident Case
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Incident Title</label>
                <input
                  type="text"
                  className="soc-input"
                  placeholder="e.g. Distributed SSH Credential Stuffing Attack"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Severity Level</label>
                <select
                  className="soc-input"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Assigned Lead Analyst</label>
                <input
                  type="text"
                  className="soc-input"
                  placeholder={user?.username || 'admin'}
                  value={newIncident.assignedTo}
                  onChange={(e) => setNewIncident({ ...newIncident, assignedTo: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Initial Scope & Description</label>
                <textarea
                  className="soc-input"
                  rows="3"
                  placeholder="Describe compromised assets, affected hostnames, or observed attack signatures..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-danger">
                  Open Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
