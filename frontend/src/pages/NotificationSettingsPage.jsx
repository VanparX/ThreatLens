import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Smartphone, Send, Save, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

export default function NotificationSettingsPage() {
  const { isAdmin } = useAuth();
  const [settings, setSettings]   = useState(null);
  const [records, setRecords]     = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading]   = useState(true);
  const [recordsError, setRecordsError]       = useState(null);
  const [page, setPage]                       = useState(0);
  const [pageSize]                            = useState(20);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalElements, setTotalElements]     = useState(0);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [form, setForm]           = useState({
    emailEnabled: true, smsEnabled: true,
    recipientEmail: '', recipientPhone: '', minSeverity: 'HIGH'
  });

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const sRes = await api.get('/notifications/settings');
      const s = sRes?.data ?? sRes;
      setSettings(s);
      setForm({
        emailEnabled:   s?.emailEnabled  ?? true,
        smsEnabled:     s?.smsEnabled    ?? true,
        recipientEmail: s?.recipientEmail || '',
        recipientPhone: s?.recipientPhone || '',
        minSeverity:    s?.minSeverity    || 'HIGH'
      });
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadRecords = useCallback(async (targetPage = page) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const rRes = await api.get('/notifications/records', {
        params: { page: targetPage, size: pageSize }
      });
      const r = rRes?.data ?? rRes;
      const content = r?.content ?? (Array.isArray(r) ? r : []);
      setRecords(content);
      setTotalPages(r?.totalPages || 1);
      setTotalElements(r?.totalElements ?? content.length);
    } catch (err) {
      console.error('Failed to load notification records:', err);
      setRecordsError(err?.message || 'Failed to retrieve notification records');
    } finally {
      setRecordsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadRecords(page);
  }, [page, loadRecords]);

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleRefresh = () => {
    loadSettings();
    loadRecords(page);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put('/notifications/settings', form);
      toast('success', 'Notification settings saved');
      loadSettings();
      setPage(0);
    } catch (err) { toast('error', err.message); }
    finally { setSaving(false); }
  };

  const testDispatch = async (channel) => {
    setTesting(true);
    try {
      await api.post('/notifications/test', {
        channel,
        targetRecipient: channel === 'EMAIL' ? form.recipientEmail : form.recipientPhone,
        customMessage: `ThreatLens test notification (${channel})`
      });
      toast('success', `Test ${channel} dispatched`);
      setPage(0);
      loadRecords(0);
    } catch (err) { toast('error', err.message); }
    finally { setTesting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Configure alert delivery channels and verify dispatch capability.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={settingsLoading || recordsLoading}>
            <RefreshCw size={13} className={settingsLoading || recordsLoading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>}

      {!isAdmin && (
        <div className="inline-feedback error">Admin role required to modify notification settings.</div>
      )}

      {/* Settings + test panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Settings form */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Delivery channels</span>
          </div>
          <form onSubmit={save}>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, fontSize: '0.857rem' }}>
                    <Mail size={14} style={{ color: 'var(--text-secondary)' }} /> Email
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.764rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.emailEnabled} onChange={e => setForm(f => ({ ...f, emailEnabled: e.target.checked }))} style={{ accentColor: 'var(--text-primary)' }} />
                    Enabled
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Recipient email</label>
                  <input type="email" className="form-input" placeholder="analyst@example.com" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} disabled={!form.emailEnabled} />
                </div>
              </div>

              {/* SMS */}
              <div style={{ paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, fontSize: '0.857rem' }}>
                    <Smartphone size={14} style={{ color: 'var(--sev-low)' }} /> SMS
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.764rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.smsEnabled} onChange={e => setForm(f => ({ ...f, smsEnabled: e.target.checked }))} style={{ accentColor: 'var(--sev-low)' }} />
                    Enabled
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <input type="text" className="form-input" placeholder="+15550001234" value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} disabled={!form.smsEnabled} />
                </div>
              </div>

              {/* Min severity */}
              <div className="form-group">
                <label className="form-label">Minimum severity to dispatch</label>
                <select className="form-select" value={form.minSeverity} onChange={e => setForm(f => ({ ...f, minSeverity: e.target.value }))}>
                  <option value="CRITICAL">CRITICAL only</option>
                  <option value="HIGH">HIGH and above</option>
                  <option value="MEDIUM">MEDIUM and above</option>
                  <option value="LOW">All severities</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !isAdmin}>
                  <Save size={13} /> {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Test panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Test dispatch</span>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.786rem', color: 'var(--text-muted)' }}>
              Send a test notification to verify that your delivery channels are configured correctly.
            </p>

            {/* Email test */}
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.814rem', fontWeight: 500 }}>Email channel</div>
                <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>{form.recipientEmail || 'Not configured'}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => testDispatch('EMAIL')} disabled={testing || !form.recipientEmail || !form.emailEnabled}>
                <Send size={12} /> Test
              </button>
            </div>

            {/* SMS test */}
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.814rem', fontWeight: 500 }}>SMS channel</div>
                <div style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>{form.recipientPhone || 'Not configured'}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => testDispatch('SMS')} disabled={testing || !form.recipientPhone || !form.smsEnabled}>
                <Send size={12} /> Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification records */}
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-header">
          <span className="panel-title">Dispatch log</span>
          <span style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>
            {recordsLoading && records.length === 0 ? 'Loading…' : `${totalElements.toLocaleString()} records`}
          </span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '75px' }}>Channel</th>
                <th>Recipient</th>
                <th style={{ width: '80px' }}>Status</th>
                <th>Subject / Content</th>
                <th style={{ width: '155px' }}>Sent at (IST)</th>
              </tr>
            </thead>
            <tbody>
              {recordsLoading && records.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} style={{ padding: '0.75rem 1rem' }}>
                      <div className="skeleton" style={{ height: '24px', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                  </tr>
                ))
              ) : recordsError ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sev-critical)', fontSize: '0.8rem' }}>
                      <AlertCircle size={15} />
                      <span>{recordsError}</span>
                      <button className="btn btn-secondary btn-xs" onClick={() => loadRecords(page)}>
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div className="empty-state-text">No notifications dispatched yet. Configure channels and run a test dispatch.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className={`badge ${r.channel === 'EMAIL' ? 'badge-accent' : 'badge-low'}`} style={{ fontSize: '0.65rem' }}>
                        {r.channel}
                      </span>
                    </td>
                    <td className="col-mono" style={{ color: 'var(--text-secondary)' }}>{r.recipient}</td>
                    <td>
                      <span className="badge badge-low" style={{ fontSize: '0.64rem' }}>{r.status}</span>
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontSize: '0.814rem' }} title={r.subject || r.content}>
                      {r.subject || r.content}
                    </td>
                    <td className="col-mono col-dim">{formatIST(r.sentAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          background: 'var(--surface-nav)'
        }}>
          <div>
            Showing {totalElements === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} records
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page <= 0 || recordsLoading}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', padding: '0 0.35rem' }}>
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1 || recordsLoading}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
