import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Check,
  ShieldAlert,
  Flame,
  Clock,
  Filter,
  RefreshCw,
  Mail,
  Smartphone
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AlertCenter({ onNavigate }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [feedback, setFeedback] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = { page: 0, size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/alerts', { params });
      setAlerts(res.data.content || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const handleAcknowledge = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/alerts/${id}/acknowledge`);
      setFeedback({ type: 'success', text: `Alert ${id} acknowledged.` });
      fetchAlerts();
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => ({ ...prev, status: 'ACKNOWLEDGED' }));
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/alerts/${id}/assign`, { assignedTo: user?.username || 'admin' });
      setFeedback({ type: 'success', text: `Alert assigned to ${user?.username || 'admin'}.` });
      fetchAlerts();
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => ({ ...prev, status: 'ASSIGNED', assignedTo: user?.username }));
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/alerts/${id}/resolve`, {
        status: 'RESOLVED',
        resolutionNote: resolveNote || 'Threat remediated via SOC containment playbook.'
      });
      setFeedback({ type: 'success', text: `Alert resolved.` });
      setResolveNote('');
      fetchAlerts();
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => ({ ...prev, status: 'RESOLVED' }));
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle color="var(--neon-amber)" size={24} />
            <span>SOC Alert Management & Triage Center</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Investigate correlated threat detections, assign analysts, trigger containment, and resolve security alerts.
          </p>
        </div>

        <button onClick={fetchAlerts} disabled={loading} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Feed</span>
        </button>
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

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Filter size={15} />
          <span>Lifecycle State:</span>
        </div>
        <select
          className="soc-input"
          style={{ width: '180px', padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Alert States</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Main Split: Alert List & Detail Triage Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedAlert ? '1.2fr 1fr' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Alert Cards Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {alerts.length === 0 ? (
            <div className="soc-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No alerts found for this filter. Head over to <strong>Log Stream & Simulator</strong> to inject attack vectors!
            </div>
          ) : (
            alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="soc-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--neon-cyan)' : 'var(--border-color)',
                    background: isSelected ? 'rgba(0, 240, 255, 0.04)' : 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`badge badge-${(alert.severity || 'low').toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        #{alert.id?.substring(0, 8)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>{alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Recent'}</span>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: alert.status === 'OPEN' ? 'var(--neon-amber)' : alert.status === 'RESOLVED' ? 'var(--neon-emerald)' : 'var(--neon-cyan)',
                        fontWeight: 600
                      }}>
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {alert.title}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {alert.description}
                  </p>

                  {/* Channel dispatch indicator */}
                  {(alert.severity === 'CRITICAL' || alert.severity === 'HIGH') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--neon-cyan)' }}>
                        <Mail size={12} /> Email Dispatched
                      </span>
                      {alert.severity === 'CRITICAL' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--neon-emerald)' }}>
                          <Smartphone size={12} /> SMS Broadcasted
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Alert Triage Workspace */}
        {selectedAlert && (
          <div className="soc-card" style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="var(--neon-cyan)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Alert Investigation
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Alert Title</span>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAlert.title}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Details & Match Reason</span>
                <div style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {selectedAlert.description}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Assigned Responder</span>
                  <div style={{ color: 'var(--text-primary)' }}>{selectedAlert.assignedTo || 'Unassigned'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Acknowledged By</span>
                  <div style={{ color: 'var(--text-primary)' }}>{selectedAlert.acknowledgedBy || 'Pending'}</div>
                </div>
              </div>

              {/* Triage Actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Triage Actions
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedAlert.status === 'OPEN' && (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      disabled={actionLoading}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', flex: 1 }}
                    >
                      <CheckCircle size={13} />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {!selectedAlert.assignedTo && (
                    <button
                      onClick={() => handleAssign(selectedAlert.id)}
                      disabled={actionLoading}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', flex: 1 }}
                    >
                      <UserCheck size={13} />
                      <span>Claim Alert</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('incidents')}
                    className="btn btn-danger"
                    style={{ fontSize: '0.75rem', width: '100%' }}
                  >
                    <Flame size={13} />
                    <span>Open Incident Response Case</span>
                  </button>
                </div>
              </div>

              {/* Resolution Form */}
              {selectedAlert.status !== 'RESOLVED' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                    Remediation Notes
                  </label>
                  <textarea
                    className="soc-input"
                    rows="2"
                    placeholder="Enter remediation actions taken..."
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    style={{ fontSize: '0.75rem', resize: 'none', marginBottom: '0.5rem' }}
                  />
                  <button
                    onClick={() => handleResolve(selectedAlert.id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', width: '100%' }}
                  >
                    <Check size={14} />
                    <span>Mark Alert Resolved</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
