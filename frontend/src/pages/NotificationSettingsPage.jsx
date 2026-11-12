import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  Smartphone,
  Send,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Sliders,
  Bell,
  Eye,
  Info,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Server
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';
import {
  KPICard,
  StatusBadge,
  TablePagination,
  DetailDrawer,
  Modal
} from '../components/common';

/**
 * NotificationSettingsPage — Concept A Precision SOC Console
 * Alert Dispatch & Notification Governance
 */
export default function NotificationSettingsPage({
  initialSettings = null,
  initialRecords = null,
  initialPage = 0,
  initialPageSize = 20,
  initialTotalPages = null,
  initialTotalElements = null,
  initialSelectedRecord = null,
  initialTestModalOpen = false
} = {}) {
  const { isAdmin, isAnalyst } = useAuth();

  // Settings State
  const [settings, setSettings] = useState(initialSettings);
  const [settingsLoading, setSettingsLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    emailEnabled: initialSettings?.emailEnabled ?? true,
    smsEnabled: initialSettings?.smsEnabled ?? true,
    webhookEnabled: initialSettings?.webhookEnabled ?? false,
    recipientEmail: initialSettings?.recipientEmail || 'soc-alerts@threatlens.io',
    recipientPhone: initialSettings?.recipientPhone || '+15550192834',
    webhookUrl: initialSettings?.webhookUrl || '',
    minSeverity: initialSettings?.minSeverity || 'HIGH'
  });

  // Records / Audit Log State
  const [records, setRecords] = useState(initialRecords || []);
  const [recordsLoading, setRecordsLoading] = useState(!initialRecords);
  const [recordsError, setRecordsError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? (initialRecords ? 1 : 1));
  const [totalElements, setTotalElements] = useState(
    initialTotalElements ?? (initialRecords ? initialRecords.length : 0)
  );

  // UI / Inspection State
  const [feedback, setFeedback] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(initialSelectedRecord);
  const [isTestModalOpen, setIsTestModalOpen] = useState(initialTestModalOpen);
  const [testTesting, setTestTesting] = useState(false);
  const [testForm, setTestForm] = useState({
    channel: 'EMAIL',
    targetRecipient: '',
    customMessage: 'ThreatLens SOC diagnostic test notification.'
  });

  const toast = useCallback((type, text, details = '') => {
    setFeedback({ type, text, details });
    if (type === 'success') {
      setTimeout(() => setFeedback(null), 6000);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/notifications/settings');
      const s = res?.data ?? res;
      setSettings(s);
      setForm({
        emailEnabled: s?.emailEnabled ?? true,
        smsEnabled: s?.smsEnabled ?? true,
        webhookEnabled: s?.webhookEnabled ?? false,
        recipientEmail: s?.recipientEmail || 'soc-alerts@threatlens.io',
        recipientPhone: s?.recipientPhone || '+15550192834',
        webhookUrl: s?.webhookUrl || '',
        minSeverity: s?.minSeverity || 'HIGH'
      });
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      toast('error', 'Failed to retrieve notification settings', err?.message || 'Server communication error');
    } finally {
      setSettingsLoading(false);
    }
  }, [toast]);

  const loadRecords = useCallback(async (targetPage = page, targetSize = pageSize) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const res = await api.get('/notifications/records', {
        params: { page: targetPage, size: targetSize }
      });
      const data = res?.data ?? res;
      const content = data?.content ?? (Array.isArray(data) ? data : []);
      setRecords(content);
      setTotalPages(data?.totalPages || 1);
      setTotalElements(data?.totalElements ?? content.length);
    } catch (err) {
      console.error('Failed to load notification records:', err);
      const msg = err?.message || 'Failed to retrieve notification dispatch records';
      setRecordsError(msg);
    } finally {
      setRecordsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (!initialSettings) {
      loadSettings();
    }
  }, [initialSettings, loadSettings]);

  useEffect(() => {
    if (!initialRecords) {
      loadRecords(page, pageSize);
    }
  }, [initialRecords, page, pageSize, loadRecords]);

  const handleRefresh = () => {
    loadSettings();
    loadRecords(page, pageSize);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast('error', 'Action Restricted', 'Administrative privilege (ADMIN role) required to modify notification settings.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/notifications/settings', {
        emailEnabled: Boolean(form.emailEnabled),
        smsEnabled: Boolean(form.smsEnabled),
        webhookEnabled: Boolean(form.webhookEnabled),
        recipientEmail: form.recipientEmail?.trim() || null,
        recipientPhone: form.recipientPhone?.trim() || null,
        webhookUrl: form.webhookUrl?.trim() || '',
        minSeverity: form.minSeverity
      });
      const updated = res?.data ?? res;
      setSettings(updated);
      toast('success', 'Notification settings successfully updated and synchronized.');
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      toast('error', 'Failed to save notification settings', err?.message || 'Validation or access control failure');
    } finally {
      setSaving(false);
    }
  };

  const openTestModal = (defaultChannel = 'EMAIL') => {
    setTestForm({
      channel: defaultChannel,
      targetRecipient: defaultChannel === 'EMAIL' ? form.recipientEmail : form.recipientPhone,
      customMessage: `ThreatLens SOC diagnostic test notification via ${defaultChannel}.`
    });
    setIsTestModalOpen(true);
  };

  const handleExecuteTest = async () => {
    if (!isAnalyst) {
      toast('error', 'Action Restricted', 'Analyst or Admin privilege required to execute diagnostic dispatches.');
      return;
    }
    setTestTesting(true);
    try {
      const payload = {
        channel: testForm.channel,
        targetRecipient: testForm.targetRecipient?.trim() || undefined,
        customMessage: testForm.customMessage?.trim() || undefined
      };
      const res = await api.post('/notifications/test', payload);
      const record = res?.data ?? res;
      setIsTestModalOpen(false);

      if (record?.status === 'DELIVERED') {
        toast('success', `Test ${testForm.channel} Dispatched Successfully`, record?.details || 'Notification delivered via configured transport.');
      } else {
        toast('warning', `Test ${testForm.channel} Recorded with Warning`, record?.details || 'Recorded without external network transmission.');
      }
      // Refresh dispatch log
      setPage(0);
      loadRecords(0, pageSize);
    } catch (err) {
      console.error('Test notification failed:', err);
      toast('error', 'Test Dispatch Rejected', err?.message || 'SMTP or gateway communication failure');
    } finally {
      setTestTesting(false);
    }
  };

  // Telemetry Aggregates (derived from records & settings)
  const stats = useMemo(() => {
    // Current-page record metrics (the backend API only returns paginated records, no global delivered/failed counts)
    const pageTotal = records.length;
    const pageDeliveredCount = records.filter(r => r.status === 'DELIVERED').length;
    const pageFailedCount = records.filter(r => r.status === 'FAILED').length;
    const pageDeliveredRate = pageTotal > 0 ? Math.round((pageDeliveredCount / pageTotal) * 100) : 100;

    // Only count genuinely supported and operational delivery channels (Email & SMS simulator).
    // Webhook is stored configuration only and does not dispatch outbound notifications.
    let activeOperationalChannels = 0;
    if (form.emailEnabled) activeOperationalChannels++;
    if (form.smsEnabled) activeOperationalChannels++;

    return {
      totalDispatches: totalElements, // Database-wide total count from Spring Pageable totalElements
      pageDeliveredRate,
      pageDeliveredCount,
      pageFailedCount,
      pageTotal,
      activeOperationalChannels
    };
  }, [records, totalElements, form]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Precision SOC Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                color: 'var(--tl-accent-primary)',
                textTransform: 'uppercase',
                fontWeight: 600
              }}
            >
              THREATLENS // ALERT DISPATCH &amp; NOTIFICATIONS
            </span>
            <span
              className="badge badge-low"
              style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', letterSpacing: '0.04em' }}
            >
              DISPATCH ENGINE: ARMED
            </span>
          </div>
          <h1 className="page-title">Notification Settings &amp; Dispatch History</h1>
          <p className="page-subtitle">
            Configure alert escalation routes, minimum severity thresholds, and verify live delivery capabilities.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={settingsLoading || recordsLoading}
            title="Refresh settings and dispatch audit logs"
          >
            <RefreshCw size={13} className={settingsLoading || recordsLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {isAnalyst && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openTestModal('EMAIL')}
            >
              <Send size={13} />
              <span>Test Dispatch</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`inline-feedback ${feedback.type}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem 1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} style={{ color: 'var(--tl-sev-low)', marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={16} style={{ color: 'var(--tl-sev-critical)', marginTop: '2px', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.814rem' }}>{feedback.text}</div>
              {feedback.details && (
                <div style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {feedback.details}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setFeedback(null)}
            style={{ padding: '0.15rem 0.4rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RBAC Notice for Non-Admins */}
      {!isAdmin && (
        <div
          className="panel"
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--tl-sev-high-bg)',
            borderColor: 'var(--tl-sev-high-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          <ShieldAlert size={16} style={{ color: 'var(--tl-sev-high)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.786rem', color: 'var(--tl-text-primary)' }}>
            <strong>Administrative Clearance Required:</strong> Only SOC Administrators (<code>ADMIN</code> role) can update notification channels and dispatch thresholds. Operational analysts may review history and execute diagnostic tests.
          </div>
        </div>
      )}

      {/* Telemetry KPI Strip */}
      <div className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        <KPICard
          label="Total Dispatches"
          value={stats.totalDispatches.toLocaleString()}
          sub="Database-wide dispatch records"
          icon={Bell}
          variant="default"
          loading={recordsLoading && records.length === 0}
        />
        <KPICard
          label="Page Delivery Success"
          value={`${stats.pageDeliveredRate}%`}
          sub={`Loaded page (${stats.pageDeliveredCount}/${stats.pageTotal} delivered)`}
          icon={CheckCircle2}
          variant="healthy"
          loading={recordsLoading && records.length === 0}
        />
        <KPICard
          label="Page Delivery Warnings"
          value={stats.pageFailedCount}
          sub={`Loaded page (${stats.pageFailedCount}/${stats.pageTotal} failed)`}
          icon={AlertCircle}
          variant={stats.pageFailedCount > 0 ? 'warning' : 'healthy'}
          loading={recordsLoading && records.length === 0}
        />
        <KPICard
          label="Enabled Channels"
          value={`${stats.activeOperationalChannels} / 2`}
          sub="supported channels enabled. Enabled state does not guarantee successful delivery or transport connectivity."
          icon={Radio}
          variant="accent"
          loading={settingsLoading}
        />
      </div>

      <div style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginTop: '-0.5rem', paddingLeft: '0.25rem' }}>
        * {stats.activeOperationalChannels} / 2 supported channels enabled. Enabled state does not guarantee successful delivery or transport connectivity.
      </div>

      {/* Operational Credential Architecture Transparency */}
      <div
        className="panel"
        style={{
          padding: '0.85rem 1rem',
          background: 'var(--tl-bg-surface)',
          border: '1px solid var(--tl-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={14} style={{ color: 'var(--tl-accent-primary)' }} />
          <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--tl-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Enterprise Transport &amp; Secret Isolation Disclosure
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          SMTP host credentials (<code>SPRING_MAIL_HOST</code>, <code>SPRING_MAIL_USERNAME</code>, <code>SPRING_MAIL_PASSWORD</code>) are injected via secure runtime environment properties and never stored in client-accessible database models or returned in API payloads. Carrier SMS dispatches are processed through ThreatLens&apos;s internal telecom gateway simulator for non-intrusive SOC verification. Enabled state does not guarantee successful delivery or transport connectivity.
        </p>
      </div>

      {/* Main Configuration Grid: Settings Form & Diagnostic Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', alignItems: 'start' }}>
        {/* Settings Form Card */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={14} style={{ color: 'var(--tl-text-secondary)' }} />
              <span className="panel-title">Delivery Channels &amp; Policy</span>
            </div>
            {isAdmin ? (
              <span className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                ADMIN EDIT ACCESS
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                READ-ONLY MODE
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Email Transport Settings */}
              <div
                style={{
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={15} style={{ color: 'var(--tl-accent-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--tl-text-primary)' }}>
                      Email Notification Channel
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.764rem', color: 'var(--tl-text-secondary)', cursor: isAdmin ? 'pointer' : 'default' }}>
                    <input
                      type="checkbox"
                      checked={form.emailEnabled}
                      disabled={!isAdmin}
                      onChange={e => setForm(f => ({ ...f, emailEnabled: e.target.checked }))}
                      style={{ accentColor: 'var(--tl-accent-primary)' }}
                    />
                    <span>{form.emailEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Primary Alert Recipient (SOC Mailbox)
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="soc-alerts@threatlens.io"
                    value={form.recipientEmail}
                    disabled={!form.emailEnabled || !isAdmin}
                    onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Receives HTML threat bulletins formatted with score factors and IP provenance.
                  </span>
                </div>

                {/* Masked SMTP Credentials Display */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.714rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--tl-text-muted)', display: 'block' }}>SMTP Transport Host</span>
                    <span className="col-mono" style={{ color: 'var(--tl-text-primary)' }}>[SPRING_MAIL_HOST]</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tl-text-muted)', display: 'block' }}>Auth Credential</span>
                    <span className="col-mono" style={{ color: 'var(--tl-text-muted)' }}>•••••••••••••••• (Secure Env)</span>
                  </div>
                </div>
              </div>

              {/* SMS Simulator Channel */}
              <div
                style={{
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smartphone size={15} style={{ color: 'var(--tl-sev-high)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--tl-text-primary)' }}>
                      SMS Channel (Telecom Gateway Simulator)
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.764rem', color: 'var(--tl-text-secondary)', cursor: isAdmin ? 'pointer' : 'default' }}>
                    <input
                      type="checkbox"
                      checked={form.smsEnabled}
                      disabled={!isAdmin}
                      onChange={e => setForm(f => ({ ...f, smsEnabled: e.target.checked }))}
                      style={{ accentColor: 'var(--tl-sev-high)' }}
                    />
                    <span>{form.smsEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    On-Call Phone Number (E.164 Format)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+15550192834"
                    value={form.recipientPhone}
                    disabled={!form.smsEnabled || !isAdmin}
                    onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Simulated carrier delivery for urgent SMS bulletins with direct SOC action links.
                  </span>
                </div>
              </div>

              {/* Webhook Channel (Configuration Storage Only — No Outbound Dispatch) */}
              <div
                style={{
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Globe size={15} style={{ color: 'var(--tl-sev-medium)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--tl-text-primary)' }}>
                      Webhook Outbound Integration
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                      CONFIG ONLY — NON-DISPATCHING
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.764rem', color: 'var(--tl-text-secondary)', cursor: isAdmin ? 'pointer' : 'default' }}>
                    <input
                      type="checkbox"
                      checked={form.webhookEnabled}
                      disabled={!isAdmin}
                      onChange={e => setForm(f => ({ ...f, webhookEnabled: e.target.checked }))}
                      style={{ accentColor: 'var(--tl-accent-primary)' }}
                    />
                    <span>{form.webhookEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    SIEM / SOAR HTTP Post Endpoint
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://hooks.slack.com/services/... or https://siem.example.com/alerts"
                    value={form.webhookUrl}
                    disabled={!form.webhookEnabled || !isAdmin}
                    onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginTop: '0.35rem', display: 'block', lineHeight: 1.4 }}>
                    Notice: Webhook URL is saved in database settings for prospective integration. Outbound HTTP dispatch is not implemented in the backend engine; alerts will not be transmitted to this endpoint.
                  </span>
                </div>
              </div>

              {/* Minimum Severity Filter Threshold */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Dispatch Severity Threshold
                </label>
                <select
                  className="form-select"
                  value={form.minSeverity}
                  disabled={!isAdmin}
                  onChange={e => setForm(f => ({ ...f, minSeverity: e.target.value }))}
                >
                  <option value="CRITICAL">CRITICAL ONLY — P1 Emergency Incidents</option>
                  <option value="HIGH">HIGH &amp; CRITICAL — Elevated Threats (Recommended)</option>
                  <option value="MEDIUM">MEDIUM &amp; ABOVE — Standard Operational Triage</option>
                  <option value="LOW">ALL SEVERITIES (LOW, MEDIUM, HIGH, CRITICAL)</option>
                </select>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Alerts with a severity rating below this setting are suppressed from outbound notifications to protect against alert fatigue.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--tl-border-subtle)' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={saving || !isAdmin}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Save size={13} />
                  <span>{saving ? 'Persisting Configuration…' : 'Save Notification Policy'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Diagnostic Dispatch Verification Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Diagnostic Dispatch Verification</span>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.786rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Validate outbound alert pipelines without waiting for security detections. Diagnostic payloads are recorded directly in the notification audit log.
              </p>

              {/* Email Diagnostic Quick Action */}
              <div
                style={{
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.814rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    Email Pipeline
                  </div>
                  <div className="col-mono" style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)' }}>
                    {form.recipientEmail || 'soc-alerts@threatlens.io'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => openTestModal('EMAIL')}
                  disabled={!isAnalyst}
                >
                  <Send size={11} /> Test Email
                </button>
              </div>

              {/* SMS Diagnostic Quick Action */}
              <div
                style={{
                  background: 'var(--tl-bg-surface-elev)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.814rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    SMS Simulator Pipeline
                  </div>
                  <div className="col-mono" style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)' }}>
                    {form.recipientPhone || '+15550192834'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => openTestModal('SMS')}
                  disabled={!isAnalyst}
                >
                  <Send size={11} /> Test SMS
                </button>
              </div>

              {/* Custom Parameterized Test Trigger */}
              <div style={{ paddingTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openTestModal('EMAIL')}
                  disabled={!isAnalyst}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Configure Custom Diagnostic Payload…
                </button>
              </div>
            </div>
          </div>

          {/* Operational Policy Guide */}
          <div className="panel" style={{ background: 'var(--tl-bg-surface)' }}>
            <div className="panel-header">
              <span className="panel-title" style={{ fontSize: '0.786rem' }}>Policy Standards</span>
            </div>
            <div className="panel-body" style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--tl-sev-low)', marginTop: '2px', flexShrink: 0 }} />
                <span>Duplicate alert suppression guarantees no email storms for identical alerts.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--tl-sev-low)', marginTop: '2px', flexShrink: 0 }} />
                <span>Failures are sanitized to prevent authentication token leakage in log records.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--tl-sev-low)', marginTop: '2px', flexShrink: 0 }} />
                <span>Audit records link alerts directly to forensic dispatch outcomes.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outbound Dispatch History Data Grid */}
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} style={{ color: 'var(--tl-text-secondary)' }} />
            <span className="panel-title">Outbound Notification Audit Log</span>
          </div>
          <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {recordsLoading && records.length === 0
              ? 'Querying records…'
              : `Showing ${records.length} records on current page (${totalElements.toLocaleString()} total in database)`}
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Channel</th>
                <th style={{ width: '90px' }}>Status</th>
                <th>Recipient</th>
                <th>Subject / Content Bulletin</th>
                <th style={{ width: '85px' }}>Severity</th>
                <th style={{ width: '165px' }}>Sent (IST)</th>
                <th style={{ width: '70px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recordsLoading && records.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: '0.75rem 1rem' }}>
                      <div className="skeleton" style={{ height: '22px', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                  </tr>
                ))
              ) : recordsError ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--tl-sev-critical)', fontSize: '0.814rem' }}>
                      <AlertCircle size={15} />
                      <span>{recordsError}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => loadRecords(page, pageSize)}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '2.5rem' }}>
                      <div className="empty-state-title">No notification dispatches recorded</div>
                      <div className="empty-state-text">
                        Automated alert dispatches and diagnostic tests will be logged here with complete delivery telemetry.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  const isSimulatedSms = record.channel === 'SMS';
                  const isDelivered = record.status === 'DELIVERED';
                  const isFailed = record.status === 'FAILED';

                  return (
                    <tr
                      key={record.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td>
                        <span
                          className={`badge ${record.channel === 'EMAIL' ? 'badge-accent' : 'badge-low'}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {record.channel}
                          {isSimulatedSms && (
                            <span style={{ fontSize: '0.55rem', opacity: 0.75, marginLeft: '3px' }}>SIM</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <StatusBadge
                          status={record.status || 'PENDING'}
                          variant={isDelivered ? 'low' : isFailed ? 'critical' : 'medium'}
                          size="xs"
                        />
                      </td>
                      <td className="col-mono" style={{ color: 'var(--tl-text-secondary)', fontSize: '0.786rem' }}>
                        {record.recipient || '—'}
                      </td>
                      <td
                        style={{
                          maxWidth: '320px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--tl-text-primary)',
                          fontSize: '0.814rem'
                        }}
                        title={record.subject || record.content}
                      >
                        {record.alertId && (
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.62rem', marginRight: '0.4rem', fontFamily: 'var(--font-mono)' }}
                          >
                            ALERT #{record.alertId.substring(0, 8)}
                          </span>
                        )}
                        {record.subject || record.content}
                      </td>
                      <td>
                        {record.severity ? (
                          <StatusBadge status={record.severity} size="xs" />
                        ) : (
                          <span className="col-dim">—</span>
                        )}
                      </td>
                      <td className="col-mono col-dim" style={{ fontSize: '0.75rem' }}>
                        {formatIST(record.sentAt || record.createdAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(record);
                          }}
                          style={{ padding: '0.15rem 0.4rem' }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Table Pagination */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          loading={recordsLoading}
          itemLabel="dispatches"
        />
      </div>

      {/* Diagnostic Dispatch Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Diagnostic Alert Dispatch"
        icon={<Send size={16} />}
        confirmText={testTesting ? 'Transmitting…' : 'Execute Dispatch'}
        confirmLoading={testTesting}
        confirmDisabled={testTesting || !isAnalyst}
        onConfirm={handleExecuteTest}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.814rem' }}>
          <p style={{ color: 'var(--tl-text-secondary)', margin: 0 }}>
            Initiate a live diagnostic alert across the selected transport channel to verify endpoint reachability and SOC logging.
          </p>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Transport Channel</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="channel"
                  value="EMAIL"
                  checked={testForm.channel === 'EMAIL'}
                  onChange={() => setTestForm(tf => ({
                    ...tf,
                    channel: 'EMAIL',
                    targetRecipient: form.recipientEmail
                  }))}
                />
                <span>Email (SMTP)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="channel"
                  value="SMS"
                  checked={testForm.channel === 'SMS'}
                  onChange={() => setTestForm(tf => ({
                    ...tf,
                    channel: 'SMS',
                    targetRecipient: form.recipientPhone
                  }))}
                />
                <span>SMS (Telecom Simulator)</span>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              Target Destination ({testForm.channel === 'EMAIL' ? 'Email Address' : 'Phone Number'})
            </label>
            <input
              type={testForm.channel === 'EMAIL' ? 'email' : 'text'}
              className="form-input"
              value={testForm.targetRecipient}
              onChange={e => setTestForm(tf => ({ ...tf, targetRecipient: e.target.value }))}
              placeholder={testForm.channel === 'EMAIL' ? 'analyst@threatlens.io' : '+15550192834'}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Custom Diagnostic Message</label>
            <textarea
              className="form-input"
              rows={3}
              value={testForm.customMessage}
              onChange={e => setTestForm(tf => ({ ...tf, customMessage: e.target.value }))}
            />
          </div>

          {testForm.channel === 'SMS' && (
            <div
              style={{
                padding: '0.6rem 0.75rem',
                background: 'var(--tl-sev-low-bg)',
                border: '1px solid var(--tl-sev-low-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--tl-text-primary)'
              }}
            >
              <strong>Telecom Gateway Simulation:</strong> Carrier SMS delivery is simulated internally for end-to-end audit tracking without incurring carrier billing.
            </div>
          )}
        </div>
      </Modal>

      {/* Record Inspection Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.subject || 'Notification Dispatch Record'}
        subtitle={`Channel: ${selectedRecord?.channel || '—'} // ID: ${selectedRecord?.id || '—'}`}
        badge={
          selectedRecord ? (
            <StatusBadge
              status={selectedRecord.status || 'PENDING'}
              variant={selectedRecord.status === 'DELIVERED' ? 'low' : selectedRecord.status === 'FAILED' ? 'critical' : 'medium'}
              size="xs"
            />
          ) : null
        }
        width="520px"
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.814rem' }}>
            {/* Meta attributes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--tl-bg-surface-elev)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--tl-border-subtle)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Record ID</span>
                <span className="col-mono" style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)' }}>
                  {selectedRecord.id}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Sent At (IST)</span>
                <span className="col-mono" style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)' }}>
                  {formatIST(selectedRecord.sentAt || selectedRecord.createdAt)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Channel</span>
                <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                  {selectedRecord.channel}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Severity</span>
                {selectedRecord.severity ? (
                  <StatusBadge status={selectedRecord.severity} size="xs" />
                ) : (
                  <span className="col-dim">—</span>
                )}
              </div>
            </div>

            {/* Recipient */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Recipient Address / Endpoint
              </span>
              <div
                className="col-mono"
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--tl-text-primary)'
                }}
              >
                {selectedRecord.recipient || '—'}
              </div>
            </div>

            {/* Associated Alert */}
            {selectedRecord.alertId && (
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Associated SOC Alert
                </span>
                <div
                  className="col-mono"
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--tl-accent-primary)'
                  }}
                >
                  Alert #{selectedRecord.alertId}
                </div>
              </div>
            )}

            {/* Transport Delivery Details */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Transport Telemetry &amp; Error Details
              </span>
              <div
                className="col-mono"
                style={{
                  padding: '0.65rem 0.75rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: selectedRecord.status === 'FAILED' ? 'var(--tl-sev-critical)' : 'var(--tl-text-secondary)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedRecord.details || 'No extended delivery telemetry reported.'}
              </div>
            </div>

            {/* Content Payload Preview */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Payload Content
              </span>
              <div
                className="col-mono"
                style={{
                  padding: '0.65rem 0.75rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.73rem',
                  lineHeight: 1.45,
                  color: 'var(--tl-text-mono)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedRecord.content || '—'}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
