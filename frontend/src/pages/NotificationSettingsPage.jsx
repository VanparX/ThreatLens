import React, { useState, useEffect } from 'react';
import {
  Mail,
  Smartphone,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Radio,
  RefreshCw,
  Bell
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationSettingsPage() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    emailEnabled: true,
    smsEnabled: true,
    recipientEmail: '',
    recipientPhone: '',
    minSeverity: 'HIGH'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, recordsRes] = await Promise.all([
        api.get('/notifications/settings'),
        api.get('/notifications/records?page=0&size=20')
      ]);
      setSettings(settingsRes.data);
      setFormData({
        emailEnabled: settingsRes.data?.emailEnabled ?? true,
        smsEnabled: settingsRes.data?.smsEnabled ?? true,
        recipientEmail: settingsRes.data?.recipientEmail || '',
        recipientPhone: settingsRes.data?.recipientPhone || '',
        minSeverity: settingsRes.data?.minSeverity || 'HIGH'
      });
      setRecords(recordsRes.data?.content || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/notifications/settings', formData);
      setSettings(res.data);
      setFeedback({ type: 'success', text: 'Alert notification preferences saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async (channel) => {
    try {
      setTesting(true);
      await api.post('/notifications/test', {
        channel,
        targetRecipient: channel === 'EMAIL' ? formData.recipientEmail : formData.recipientPhone,
        customMessage: `ThreatLens SOC Test Alert: Verification dispatch for ${channel} alert channel.`
      });
      setFeedback({ type: 'success', text: `Test ${channel} notification dispatched successfully!` });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell color="var(--neon-cyan)" size={24} />
            <span>Alert Notification Channels (Email & SMS)</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Configure emergency outbound delivery channels for critical security advisories and zero-day breaches.
          </p>
        </div>

        <button onClick={fetchData} disabled={loading} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
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

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Email & SMS Settings Form */}
        <form onSubmit={handleSave} className="soc-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            Delivery Channel Preferences
          </h3>

          {/* Email Channel Config */}
          <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={17} color="var(--neon-cyan)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Security Advisories</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={formData.emailEnabled}
                  onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
                  style={{ accentColor: 'var(--neon-cyan)' }}
                />
                Enabled
              </label>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Recipient Analyst Email</label>
              <input
                type="email"
                className="soc-input"
                placeholder="soc-alerts@threatlens.io"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                required={formData.emailEnabled}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* SMS Channel Config */}
          <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={17} color="var(--neon-emerald)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Emergency SMS Notifications</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={formData.smsEnabled}
                  onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                  style={{ accentColor: 'var(--neon-emerald)' }}
                />
                Enabled
              </label>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Duty Officer Mobile Phone Number</label>
              <input
                type="text"
                className="soc-input"
                placeholder="+15550192834"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                required={formData.smsEnabled}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Minimum Severity Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Minimum Alert Severity to Dispatch</label>
            <select
              className="soc-input"
              value={formData.minSeverity}
              onChange={(e) => setFormData({ ...formData, minSeverity: e.target.value })}
            >
              <option value="CRITICAL">CRITICAL (Only major zero-days & ransomware)</option>
              <option value="HIGH">HIGH (High and Critical incidents)</option>
              <option value="MEDIUM">MEDIUM (Moderate, High & Critical)</option>
              <option value="LOW">LOW (All alerts)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Channel Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Live Channel Testing Station */}
        <div className="soc-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            Live Diagnostic Dispatch Station
          </h3>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Verify that your outbound notification gateways and email/SMS handlers are actively receiving transmissions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>Email Channel Test</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: {formData.recipientEmail || 'Not configured'}</div>
              </div>
              <button
                type="button"
                onClick={() => handleTestDispatch('EMAIL')}
                disabled={testing || !formData.recipientEmail}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem' }}
              >
                <Send size={13} />
                <span>Dispatch Test Email</span>
              </button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>SMS Channel Test</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: {formData.recipientPhone || 'Not configured'}</div>
              </div>
              <button
                type="button"
                onClick={() => handleTestDispatch('SMS')}
                disabled={testing || !formData.recipientPhone}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem' }}
              >
                <Send size={13} />
                <span>Dispatch Test SMS</span>
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>Operational Note:</strong> In addition to automated real-time dispatch on threat detection, alerts can be tested on-demand for capstone evaluation.
          </div>
        </div>
      </div>

      {/* Dispatched Notification Records Log */}
      <div className="soc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Recent Dispatched Notification Logs ({records.length})
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Outbound Audit Log</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                <th style={{ padding: '0.65rem 1rem' }}>Channel</th>
                <th style={{ padding: '0.65rem 1rem' }}>Recipient</th>
                <th style={{ padding: '0.65rem 1rem' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem' }}>Subject / Preview</th>
                <th style={{ padding: '0.65rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.65rem 1rem' }}>Gateway Details</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No notification dispatch records logged yet. Trigger an attack simulation or run a test dispatch above!
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color-subtle)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: r.channel === 'EMAIL' ? 'var(--neon-cyan)' : 'var(--neon-emerald)' }}>
                      {r.channel}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {r.recipient}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'var(--badge-low-bg)',
                        color: 'var(--badge-low-text)',
                        border: '1px solid var(--badge-low-border)'
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.subject || r.content}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : 'Just now'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      {r.details || 'Delivered'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
