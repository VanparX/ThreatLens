import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  Clock,
  Layers
} from 'lucide-react';
import api from '../api/client';

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    type: 'EVENT_TYPE_MATCH',
    severity: 'HIGH',
    enabled: true,
    condition: {
      eventTypes: ['AUTHENTICATION_FAILURE'],
      thresholdCount: 3,
      thresholdWindowSeconds: 60
    }
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rules?page=0&size=50');
      setRules(res.data.content || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id, currentlyEnabled) => {
    try {
      setActionLoading(true);
      const endpoint = currentlyEnabled ? `/rules/${id}/disable` : `/rules/${id}/enable`;
      await api.put(endpoint);
      setFeedback({
        type: 'success',
        text: `Rule ${currentlyEnabled ? 'disabled' : 'enabled'} in real-time engine.`
      });
      fetchRules();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/rules', newRule);
      setShowCreateModal(false);
      setNewRule({
        name: '',
        description: '',
        type: 'EVENT_TYPE_MATCH',
        severity: 'HIGH',
        enabled: true,
        condition: {
          eventTypes: ['AUTHENTICATION_FAILURE'],
          thresholdCount: 3,
          thresholdWindowSeconds: 60
        }
      });
      setFeedback({ type: 'success', text: 'New detection rule deployed to SIEM correlation engine.' });
      fetchRules();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders color="var(--neon-cyan)" size={24} />
            <span>Detection Rule Engine Configuration</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time correlation rules evaluating sliding-window frequencies, payload signatures, and anomaly criteria.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Plus size={15} />
            <span>New Detection Rule</span>
          </button>
          <button onClick={fetchRules} disabled={loading} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
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

      {/* Overview Card */}
      <div className="soc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <Layers size={24} color="var(--neon-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Active Correlation Status: {activeCount} of {rules.length} Rules Armed
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Events streamed through log ingestion are evaluated concurrently against all armed detection rules.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="soc-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.85rem',
              border: rule.enabled ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid var(--border-color)',
              opacity: rule.enabled ? 1 : 0.65
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className={`badge badge-${(rule.severity || 'high').toLowerCase()}`}>
                  {rule.severity}
                </span>

                <span style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-secondary)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  color: 'var(--neon-cyan)'
                }}>
                  {rule.type}
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                {rule.name}
              </h3>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                {rule.description}
              </p>
            </div>

            {/* Condition preview box */}
            <div style={{ background: 'var(--bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                Matching Criteria:
              </div>
              {rule.condition?.eventTypes && (
                <div>Events: <strong style={{ color: 'var(--text-primary)' }}>{rule.condition.eventTypes.join(', ')}</strong></div>
              )}
              {rule.condition?.thresholdCount && (
                <div>Threshold: <strong style={{ color: 'var(--neon-amber)' }}>{rule.condition.thresholdCount} events</strong> in {rule.condition.thresholdWindowSeconds}s</div>
              )}
            </div>

            {/* Footer action toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', color: rule.enabled ? 'var(--neon-emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {rule.enabled ? <CheckCircle size={13} /> : <XCircle size={13} />}
                <span>{rule.enabled ? 'ACTIVE & EVALUATING' : 'DISABLED'}</span>
              </span>

              <button
                onClick={() => handleToggle(rule.id, rule.enabled)}
                disabled={actionLoading}
                className={`btn ${rule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}
              >
                {rule.enabled ? 'Disable Rule' : 'Arm Rule'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Detection Rule */}
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
          <div className="soc-card" style={{ maxWidth: '520px', width: '100%', border: '1px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={20} color="var(--neon-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Deploy Detection Rule
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Rule Name</label>
                <input
                  type="text"
                  className="soc-input"
                  placeholder="e.g. Distributed Credential Stuffing"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Description</label>
                <input
                  type="text"
                  className="soc-input"
                  placeholder="Logic and behavior description..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Rule Type</label>
                  <select
                    className="soc-input"
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    <option value="EVENT_TYPE_MATCH">EVENT_TYPE_MATCH</option>
                    <option value="THRESHOLD">THRESHOLD</option>
                    <option value="PATTERN_MATCH">PATTERN_MATCH</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Severity</label>
                  <select
                    className="soc-input"
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Target Event Type</label>
                <select
                  className="soc-input"
                  value={newRule.condition.eventTypes[0]}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    condition: { ...newRule.condition, eventTypes: [e.target.value] }
                  })}
                >
                  <option value="AUTHENTICATION_FAILURE">AUTHENTICATION_FAILURE</option>
                  <option value="BRUTE_FORCE">BRUTE_FORCE</option>
                  <option value="PORT_SCAN">PORT_SCAN</option>
                  <option value="RANSOMWARE_DETECTED">RANSOMWARE_DETECTED</option>
                  <option value="PRIVILEGE_ESCALATION">PRIVILEGE_ESCALATION</option>
                  <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
                </select>
              </div>

              {newRule.type === 'THRESHOLD' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Threshold Count</label>
                    <input
                      type="number"
                      min="1"
                      className="soc-input"
                      value={newRule.condition.thresholdCount}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        condition: { ...newRule.condition, thresholdCount: parseInt(e.target.value) || 1 }
                      })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Sliding Window (Seconds)</label>
                    <input
                      type="number"
                      min="5"
                      className="soc-input"
                      value={newRule.condition.thresholdWindowSeconds}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        condition: { ...newRule.condition, thresholdWindowSeconds: parseInt(e.target.value) || 60 }
                      })}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  Deploy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
