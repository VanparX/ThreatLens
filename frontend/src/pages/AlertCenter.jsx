import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  UserCheck,
  Flame,
  Archive,
  Terminal,
  Radar,
  FileText,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' }
];

const SEVERITY_OPTS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical Severity' },
  { value: 'HIGH', label: 'High Severity' },
  { value: 'MEDIUM', label: 'Medium Severity' },
  { value: 'LOW', label: 'Low Severity' }
];

const STATUS_META = {
  OPEN: { label: 'Open', badge: 'badge-high', dot: 'status-dot-critical' },
  ACKNOWLEDGED: { label: 'Acknowledged', badge: 'badge-medium', dot: 'status-dot-warning' },
  ASSIGNED: { label: 'Assigned', badge: 'badge-info', dot: 'status-dot-busy' },
  RESOLVED: { label: 'Resolved', badge: 'badge-low', dot: 'status-dot-online' },
  CLOSED: { label: 'Closed', badge: 'badge-neutral', dot: 'status-dot-offline' }
};

export default function AlertCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, canWrite } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item & Contextual Data
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [assignInput, setAssignInput] = useState('');

  // Detection & Log Context
  const [detectionContext, setDetectionContext] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [logContext, setLogContext] = useState(null);
  const [logLoading, setLogLoading] = useState(false);

  // Linked Incident Context & Modal
  const [linkedIncident, setLinkedIncident] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateForm, setEscalateForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    assignedTo: ''
  });

  // KPI Overview Metrics
  const [kpiStats, setKpiStats] = useState({
    totalAlerts: 0,
    openAlerts: 0,
    criticalCount: 0,
    highCount: 0
  });

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Load KPI overview metrics
  const loadKpis = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      const d = res?.data ?? res;
      if (d) {
        const sevMap = d.alertsBySeverity || {};
        setKpiStats({
          totalAlerts: d.totalAlerts || 0,
          openAlerts: d.openAlerts || 0,
          criticalCount: sevMap['CRITICAL'] || 0,
          highCount: sevMap['HIGH'] || 0
        });
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  // Fetch paginated alerts
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize
      };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await api.get('/alerts', { params });
      const d = res?.data ?? res;
      const items = d?.content ?? (Array.isArray(d) ? d : []);
      setAlerts(items);
      setTotalPages(d?.totalPages || 1);
      setTotalElements(d?.totalElements ?? items.length);

      // Refresh selected alert if still present in current view
      if (selectedAlert) {
        const updated = items.find(a => a.id === selectedAlert.id);
        if (updated) setSelectedAlert(updated);
      }
    } catch (err) {
      toast('error', err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, severityFilter, selectedAlert?.id]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    loadAlerts();
  }, [page, pageSize, statusFilter, severityFilter]);

  // Handle direct navigation via ?detectionId=... or ?alertId=...
  useEffect(() => {
    const targetDetectionId = searchParams.get('detectionId');
    const targetAlertId = searchParams.get('alertId');

    if (targetDetectionId) {
      api.get(`/alerts/by-detection/${targetDetectionId}`)
        .then(res => {
          const alert = res?.data ?? res;
          if (alert && alert.id) {
            setSelectedAlert(alert);
            toast('info', `Opened alert generated for threat detection ${targetDetectionId}`);
          }
        })
        .catch(() => {
          toast('error', `No alert found for detection ${targetDetectionId}`);
        });
    } else if (targetAlertId) {
      api.get(`/alerts/${targetAlertId}`)
        .then(res => {
          const alert = res?.data ?? res;
          if (alert && alert.id) {
            setSelectedAlert(alert);
          }
        })
        .catch(() => {
          toast('error', `Alert not found: ${targetAlertId}`);
        });
    }
  }, [searchParams]);

  // Load detection context when drawer opens
  useEffect(() => {
    let active = true;
    if (selectedAlert?.detectionId) {
      setDetectionLoading(true);
      api.get(`/detections/${selectedAlert.detectionId}`)
        .then(res => {
          if (!active) return;
          const det = res?.data ?? res;
          setDetectionContext(det);
        })
        .catch(() => {
          if (!active) return;
          setDetectionContext(null);
        })
        .finally(() => {
          if (active) setDetectionLoading(false);
        });
    } else {
      setDetectionContext(null);
    }
    return () => { active = false; };
  }, [selectedAlert?.detectionId]);

  // Load telemetry log context when drawer opens
  useEffect(() => {
    let active = true;
    const targetLogId = selectedAlert?.logId || detectionContext?.logId;
    if (targetLogId) {
      setLogLoading(true);
      api.get(`/logs/${targetLogId}`)
        .then(res => {
          if (!active) return;
          const logData = res?.data ?? res;
          setLogContext(logData);
        })
        .catch(() => {
          if (!active) return;
          setLogContext(null);
        })
        .finally(() => {
          if (active) setLogLoading(false);
        });
    } else {
      setLogContext(null);
    }
    return () => { active = false; };
  }, [selectedAlert?.logId, detectionContext?.logId]);

  // Load linked incident context when alert is selected
  useEffect(() => {
    let active = true;
    if (selectedAlert?.id) {
      setIncidentLoading(true);
      api.get(`/incidents/by-alert/${selectedAlert.id}`)
        .then(res => {
          if (!active) return;
          const inc = res?.data ?? res;
          setLinkedIncident(inc);
        })
        .catch(() => {
          if (!active) return;
          setLinkedIncident(null);
        })
        .finally(() => {
          if (active) setIncidentLoading(false);
        });
    } else {
      setLinkedIncident(null);
    }
    return () => { active = false; };
  }, [selectedAlert?.id]);

  const openEscalateModal = (alert) => {
    setEscalateForm({
      title: `Security Incident: ${alert.title || alert.id}`,
      description: `Escalated from Alert ${alert.id}.\n${alert.description || ''}\nDetection Reference: ${alert.detectionId || 'N/A'}`,
      severity: alert.severity || 'HIGH',
      assignedTo: alert.assignedTo || user?.username || 'analyst'
    });
    setShowEscalateModal(true);
  };

  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to create incident cases');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        title: escalateForm.title.trim(),
        description: escalateForm.description.trim(),
        severity: escalateForm.severity,
        assignedTo: escalateForm.assignedTo.trim() || user?.username || 'analyst',
        alertId: selectedAlert.id,
        detectionId: selectedAlert.detectionId || null,
        relatedLogIds: selectedAlert.logId ? [selectedAlert.logId] : []
      };
      const res = await api.post('/incidents', payload);
      const inc = res?.data ?? res;
      toast('success', `Incident case created: ${inc.id || 'success'}`);
      setShowEscalateModal(false);
      navigate(`/incidents?incidentId=${inc.id}`);
    } catch (err) {
      toast('error', err.message || 'Failed to create incident case');
    } finally {
      setActionLoading(false);
    }
  };

  // Lifecycle mutation actions
  const handleAcknowledge = async (id) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to acknowledge alerts');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/alerts/${id}/acknowledge`);
      const updated = res?.data ?? res;
      toast('success', 'Alert acknowledged successfully');
      loadAlerts();
      loadKpis();
      setSelectedAlert(updated || { ...selectedAlert, status: 'ACKNOWLEDGED', acknowledgedBy: user?.username });
    } catch (err) {
      toast('error', err.message || 'Failed to acknowledge alert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (id, targetAnalyst) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to assign alerts');
      return;
    }
    const analyst = (targetAnalyst || assignInput.trim() || user?.username || 'admin');
    setActionLoading(true);
    try {
      const res = await api.put(`/alerts/${id}/assign?analyst=${encodeURIComponent(analyst)}`);
      const updated = res?.data ?? res;
      toast('success', `Alert assigned to ${analyst}`);
      setAssignInput('');
      loadAlerts();
      loadKpis();
      setSelectedAlert(updated || { ...selectedAlert, status: 'ASSIGNED', assignedTo: analyst });
    } catch (err) {
      toast('error', err.message || 'Failed to assign alert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to resolve alerts');
      return;
    }
    setActionLoading(true);
    try {
      const note = resolveNote.trim() || `Resolved by ${user?.username || 'analyst'}`;
      const res = await api.put(`/alerts/${id}/resolve`, { resolutionNote: note });
      const updated = res?.data ?? res;
      toast('success', 'Alert marked as resolved');
      setResolveNote('');
      loadAlerts();
      loadKpis();
      setSelectedAlert(updated || { ...selectedAlert, status: 'RESOLVED', resolutionNote: note });
    } catch (err) {
      toast('error', err.message || 'Failed to resolve alert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (id) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to close alerts');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/alerts/${id}/close`);
      const updated = res?.data ?? res;
      toast('success', 'Alert closed and archived');
      loadAlerts();
      loadKpis();
      setSelectedAlert(updated || { ...selectedAlert, status: 'CLOSED' });
    } catch (err) {
      toast('error', err.message || 'Failed to close alert');
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side quick filter
  const filteredAlerts = alerts.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.assignedTo && item.assignedTo.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.detectionId && item.detectionId.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 52px - 3rem)' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
              <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
              {kpiStats.openAlerts > 0 ? `${kpiStats.openAlerts} ACTIVE ALERTS IN QUEUE` : 'ALERT QUEUE NOMINAL'}
            </span>
          </div>
          <h1 className="page-title">Alert Center</h1>
          <p className="page-subtitle">
            Operational triage queue, analyst assignment, remediation tracking, and alert lifecycle management.
          </p>
        </div>

        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          >
            {STATUS_OPTS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '165px' }}
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
          >
            {SEVERITY_OPTS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadAlerts(); loadKpis(); }}
            disabled={loading}
            title="Refresh alerts"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`inline-feedback ${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      {!canWrite && (
        <div style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.45rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Shield size={14} style={{ color: 'var(--text-muted)' }} />
          <span><strong>Viewer Mode:</strong> You have read-only access to alerts. Acknowledging, assigning, resolving, or closing alerts requires Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total Alerts</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">{kpiStats.totalAlerts || totalElements}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>escalations</span>
          </div>
          <div className="kpi-sub">Across all detection rules</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active &amp; In-Progress</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.openAlerts > 0 ? 'var(--sev-high)' : 'var(--text-primary)' }}>
              {kpiStats.openAlerts}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>unresolved</span>
          </div>
          <div className="kpi-sub">Open, acknowledged &amp; assigned queue</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Critical Active Queue</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.criticalCount > 0 ? 'var(--sev-critical)' : 'var(--status-online)' }}>
              {kpiStats.criticalCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>urgent</span>
          </div>
          <div className="kpi-sub">Unresolved critical severity alerts</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">High Active Queue</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.highCount > 0 ? 'var(--sev-high)' : 'var(--text-primary)' }}>
              {kpiStats.highCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>elevated</span>
          </div>
          <div className="kpi-sub">Unresolved high severity alerts</div>
        </div>
      </div>

      {/* Main Workspace (Table + Detail Drawer) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedAlert ? '1fr 440px' : '1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0
      }}>
        {/* Left Column: Alerts Table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
          {/* Table Search Toolbar */}
          <div style={{
            padding: '0.65rem 0.85rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Filter loaded page (analysts, titles, IDs)…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                style={{ paddingLeft: '1.9rem', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Showing {filteredAlerts.length} of {alerts.length} on current page • {totalElements} total in database
            </div>
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '36px' }} />
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                {searchQuery.trim() && alerts.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Matching Alerts on This Page
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No alerts on current page match &ldquo;{searchQuery}&rdquo;. Clear filter or switch pages.
                    </div>
                  </>
                ) : statusFilter || severityFilter ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Alerts Match Selected Filters
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No alerts found matching status: {statusFilter || 'All'} and severity: {severityFilter || 'All'}.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Alert Queue Nominal
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      The operational alert queue is currently empty.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Status</th>
                    <th style={{ width: '85px' }}>Severity</th>
                    <th>Alert Title &amp; Description</th>
                    <th style={{ width: '130px' }}>Assigned Analyst</th>
                    <th style={{ width: '155px' }}>Created (IST)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map(alert => {
                    const sm = STATUS_META[alert.status] || { label: alert.status, badge: 'badge-neutral', dot: 'status-dot-offline' };
                    const isSelected = selectedAlert?.id === alert.id;
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--surface-elevated)' : undefined,
                          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                      >
                        <td>
                          <span className={`badge ${sm.badge}`} style={{ fontSize: '0.65rem' }}>
                            <span className={`status-dot ${sm.dot}`} style={{ width: '5px', height: '5px' }} />
                            {sm.label}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${(alert.severity || 'low').toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                            {alert.severity}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
                            {alert.title}
                          </div>
                          <div style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '340px'
                          }}>
                            {alert.description}
                          </div>
                        </td>
                        <td>
                          {alert.assignedTo ? (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <User size={11} style={{ color: 'var(--primary)' }} />
                              {alert.assignedTo}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="col-mono col-dim" style={{ fontSize: '0.72rem' }}>
                            {formatIST(alert.createdAt)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <ArrowRight size={13} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', opacity: isSelected ? 1 : 0.4 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer with Pagination */}
          <div style={{
            padding: '0.5rem 0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              Total: <strong>{totalElements}</strong> alerts across {totalPages} pages
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                disabled={page <= 0 || loading}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(p => p + 1)}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Alert Investigation Drawer */}
        {selectedAlert && (
          <div className="panel" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
            padding: '1rem',
            borderLeft: '2px solid var(--primary)'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span className={`badge badge-${(selectedAlert.severity || 'low').toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                    {selectedAlert.severity}
                  </span>
                  <span className={`badge ${(STATUS_META[selectedAlert.status] || {}).badge || 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                    <span className={`status-dot ${(STATUS_META[selectedAlert.status] || {}).dot || 'status-dot-offline'}`} style={{ width: '5px', height: '5px' }} />
                    {selectedAlert.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {selectedAlert.title}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedAlert(null)}
                title="Close investigation drawer"
                aria-label="Close drawer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Overview & Description */}
            <div className="detail-section">
              <div className="detail-section-title">Overview &amp; Triage Rationale</div>
              <div style={{
                background: 'var(--surface-base)',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                border: '1px solid var(--border-subtle)'
              }}>
                {selectedAlert.description}
              </div>
            </div>

            {/* Originating Threat Detection Context Box */}
            {selectedAlert.detectionId && (
              <div className="detail-section">
                <div className="detail-section-title">Originating Threat Detection</div>
                {detectionLoading ? (
                  <div className="skeleton" style={{ height: '70px' }} />
                ) : detectionContext ? (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rule Name</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{detectionContext.ruleName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Risk Assessment</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className="col-mono" style={{ fontWeight: 700, color: detectionContext.riskScore >= 50 ? 'var(--sev-high)' : 'var(--text-primary)' }}>
                          {detectionContext.riskScore} / 100
                        </span>
                        <span className={`badge badge-${(detectionContext.severity || 'low').toLowerCase()}`} style={{ fontSize: '0.62rem' }}>
                          {detectionContext.riskCategory}
                        </span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Detection Status</span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        {detectionContext.status}
                      </span>
                    </div>

                    {/* Critical Investigation Warnings based on Detection Lifecycle */}
                    {detectionContext.status === 'FALSE_POSITIVE' && (
                      <div style={{
                        marginTop: '0.3rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.72rem',
                        color: 'var(--sev-high)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                        <span><strong>False Positive Warning:</strong> The originating detection was marked benign. You may close this alert.</span>
                      </div>
                    )}

                    {detectionContext.status === 'RESOLVED' && (
                      <div style={{
                        marginTop: '0.3rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.72rem',
                        color: 'var(--status-online)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <CheckCircle size={14} style={{ flexShrink: 0 }} />
                        <span><strong>Resolved Context:</strong> Originating detection was resolved{detectionContext.resolvedBy ? ` by ${detectionContext.resolvedBy}` : ''}.</span>
                      </div>
                    )}

                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/detections?detectionId=${selectedAlert.detectionId}`)}
                      style={{ justifyContent: 'flex-start', padding: '0.3rem 0', marginTop: '0.2rem' }}
                    >
                      <Radar size={13} style={{ color: 'var(--primary)' }} /> View Detection in Detection Center →
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Detection reference ID: <span className="col-mono">{selectedAlert.detectionId}</span> (Payload archived or unavailable)
                  </div>
                )}
              </div>
            )}

            {/* Triggering Security Telemetry Event */}
            {(selectedAlert.logId || detectionContext?.logId) && (
              <div className="detail-section">
                <div className="detail-section-title">Triggering Security Telemetry Event</div>
                {logLoading ? (
                  <div className="skeleton" style={{ height: '80px' }} />
                ) : logContext ? (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Event Type</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{logContext.eventType}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Source IP</span>
                      <span className="col-mono" style={{ color: 'var(--sev-high)' }}>{logContext.sourceIp || '–'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Destination IP</span>
                      <span className="col-mono">{logContext.destinationIp || '–'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Source System</span>
                      <span>{logContext.sourceSystem}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Log Timestamp</span>
                      <span className="col-mono col-dim">{formatIST(logContext.timestamp)}</span>
                    </div>
                    {logContext.message && (
                      <div style={{
                        marginTop: '0.3rem',
                        padding: '0.35rem 0.45rem',
                        background: 'var(--surface-base)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem'
                      }}>
                        {logContext.message}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Log reference: <span className="col-mono">{selectedAlert.logId || detectionContext?.logId}</span> (Payload archived)
                  </div>
                )}
              </div>
            )}

            {/* Alert Metadata */}
            <div className="detail-section">
              <div className="detail-section-title">Alert Details &amp; Assignment</div>
              <div className="detail-row">
                <span className="detail-key">Alert ID</span>
                <span className="detail-val col-mono">{selectedAlert.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Created</span>
                <span className="detail-val col-mono">{formatIST(selectedAlert.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Updated</span>
                <span className="detail-val col-mono">{formatIST(selectedAlert.updatedAt) || '–'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Assigned To</span>
                <span className="detail-val">
                  {selectedAlert.assignedTo ? (
                    <strong>{selectedAlert.assignedTo}</strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                  )}
                </span>
              </div>
              {selectedAlert.acknowledgedBy && (
                <div className="detail-row">
                  <span className="detail-key">Acknowledged By</span>
                  <span className="detail-val">{selectedAlert.acknowledgedBy} ({formatIST(selectedAlert.acknowledgedAt)})</span>
                </div>
              )}
              {selectedAlert.resolvedBy && (
                <div className="detail-row">
                  <span className="detail-key">Resolved By</span>
                  <span className="detail-val">{selectedAlert.resolvedBy} ({formatIST(selectedAlert.resolvedAt)})</span>
                </div>
              )}
              {selectedAlert.resolutionNote && (
                <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                  <span className="detail-key">Resolution Note</span>
                  <span className="detail-val" style={{ maxWidth: '240px', lineHeight: 1.4 }}>{selectedAlert.resolutionNote}</span>
                </div>
              )}
            </div>

            {/* Lifecycle Investigation Actions */}
            <div className="detail-section">
              <div className="detail-section-title">Lifecycle Investigation Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {selectedAlert.status === 'OPEN' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    title={!canWrite ? 'Analyst or Admin required' : 'Acknowledge alert'}
                  >
                    <Check size={13} /> Acknowledge Alert
                  </button>
                )}

                {selectedAlert.status !== 'RESOLVED' && selectedAlert.status !== 'CLOSED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={actionLoading || !canWrite}
                      onClick={() => handleAssign(selectedAlert.id, user?.username || 'admin')}
                      title={!canWrite ? 'Analyst or Admin required' : 'Assign to current analyst'}
                    >
                      <UserCheck size={13} /> Assign to me ({user?.username || 'admin'})
                    </button>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="Or enter analyst username…"
                        value={assignInput}
                        disabled={!canWrite}
                        onChange={e => setAssignInput(e.target.value)}
                        style={{ flex: 1, fontSize: '0.72rem' }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={actionLoading || !canWrite || !assignInput.trim()}
                        onClick={() => handleAssign(selectedAlert.id, assignInput.trim())}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}

                {selectedAlert.status !== 'RESOLVED' && selectedAlert.status !== 'CLOSED' && (
                  <div style={{
                    marginTop: '0.35rem',
                    padding: '0.55rem',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      Resolve with Remediation Note
                    </span>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      disabled={!canWrite}
                      placeholder={canWrite ? "Enter root cause, containment, or remediation notes…" : "Analyst required to resolve."}
                      value={resolveNote}
                      onChange={e => setResolveNote(e.target.value)}
                      style={{ marginBottom: '0.4rem', fontSize: '0.72rem' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading || !canWrite}
                      onClick={() => handleResolve(selectedAlert.id)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCircle size={13} /> Mark Alert Resolved
                    </button>
                  </div>
                )}

                {selectedAlert.status !== 'CLOSED' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleClose(selectedAlert.id)}
                    title={!canWrite ? 'Analyst or Admin required' : 'Close and archive alert'}
                  >
                    <Archive size={13} /> Close Alert Ticket
                  </button>
                )}

                {selectedAlert.status === 'CLOSED' && (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Archive size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>Alert is closed and archived. Lifecycle complete.</span>
                  </div>
                )}

                {linkedIncident ? (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginTop: '0.3rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Linked Case #{linkedIncident.id?.slice(-8) || linkedIncident.id}
                      </span>
                      <span className={`status-pill ${linkedIncident.status?.toLowerCase()}`}>{linkedIncident.status}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {linkedIncident.title}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/incidents?incidentId=${linkedIncident.id}`)}
                      style={{ width: '100%', justifyContent: 'center', marginTop: '0.2rem' }}
                    >
                      <Flame size={12} style={{ color: 'var(--sev-high)' }} /> Open Incident Case →
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={!canWrite || actionLoading}
                    onClick={() => openEscalateModal(selectedAlert)}
                    style={{ justifyContent: 'flex-start', marginTop: '0.2rem' }}
                    title={!canWrite ? 'Analyst or Admin required to escalate' : 'Open new incident case from this alert'}
                  >
                    <Flame size={13} style={{ color: 'var(--sev-high)' }} /> Escalate to Incident Case →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Escalate Alert to Incident Modal */}
      {showEscalateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEscalateModal(false)}>
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={16} style={{ color: 'var(--sev-high)' }} /> Escalate Alert to Incident Case
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEscalateModal(false)}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleEscalateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  fontSize: '0.74rem',
                  padding: '0.5rem 0.65rem',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)'
                }}>
                  Originating Alert: <strong style={{ color: 'var(--text-primary)' }}>{selectedAlert?.id}</strong>
                  {selectedAlert?.detectionId && (
                    <span> &bull; Detection: <strong style={{ color: 'var(--text-primary)' }}>{selectedAlert.detectionId}</strong></span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Incident Case Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={escalateForm.title}
                    onChange={e => setEscalateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Critical Brute Force on Production Gateway"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Severity *</label>
                    <select
                      className="form-select"
                      value={escalateForm.severity}
                      onChange={e => setEscalateForm(f => ({ ...f, severity: e.target.value }))}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <input
                      type="text"
                      className="form-input"
                      value={escalateForm.assignedTo}
                      onChange={e => setEscalateForm(f => ({ ...f, assignedTo: e.target.value }))}
                      placeholder={user?.username || 'analyst'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Scope &amp; Description *</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={escalateForm.description}
                    onChange={e => setEscalateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Scope, affected assets, initial triage notes…"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEscalateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading || !canWrite}>
                  <Flame size={13} /> Open Incident Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
