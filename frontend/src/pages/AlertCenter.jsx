import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Shield,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Search,
  Check,
  UserCheck,
  Flame,
  Archive,
  Terminal,
  Crosshair,
  Clock,
  User,
  ArrowRight,
  Copy,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';
import {
  KPICard,
  StatusBadge,
  TablePagination,
  DetailDrawer,
  Modal,
  FilterBar
} from '../components/common';

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

export default function AlertCenter({
  initialAlerts = null,
  initialKpiStats = null,
  initialSelectedAlert = null,
  initialLinkedIncident = null
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, canWrite } = useAuth();

  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [loading, setLoading] = useState(initialAlerts === null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(initialAlerts ? initialAlerts.length : 0);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item & Contextual Data
  const [selectedAlert, setSelectedAlert] = useState(initialSelectedAlert || null);
  const [resolveNote, setResolveNote] = useState('');
  const [assignInput, setAssignInput] = useState('');

  // Detection & Log Context
  const [detectionContext, setDetectionContext] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [logContext, setLogContext] = useState(null);
  const [logLoading, setLogLoading] = useState(false);

  // Linked Incident Context & Modal
  const [linkedIncident, setLinkedIncident] = useState(initialLinkedIncident || null);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateForm, setEscalateForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    assignedTo: ''
  });

  // KPI Overview Metrics
  const [kpiStats, setKpiStats] = useState(initialKpiStats || {
    totalAlerts: initialAlerts ? initialAlerts.length : 0,
    openAlerts: 0,
    criticalCount: 0,
    highCount: 0
  });

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleCopy = (text, idKey) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
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
            toast('info', `Opened alert for threat detection ${targetDetectionId}`);
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

  const clearAllFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
    setSearchQuery('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(statusFilter || severityFilter || searchQuery);

  return (
    <div className="soc-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="soc-header" style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--tl-border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              fontFamily: 'var(--tl-font-mono, monospace)',
              letterSpacing: '0.08em',
              color: 'var(--tl-text-muted)'
            }}>
              THREATLENS // TRIAGE &amp; REMEDIATION
            </span>
            <span className="bullet-sep" style={{ color: 'var(--tl-border-default)' }}>&bull;</span>
            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
              <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
              {kpiStats.openAlerts > 0 ? `${kpiStats.openAlerts} ACTIVE ALERTS IN QUEUE` : 'ALERT QUEUE NOMINAL'}
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
            Alert Center
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--tl-text-secondary)' }}>
            Operational triage queue, analyst assignment, remediation tracking, and alert lifecycle management.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/detections')}
            title="Navigate to Threat Detection Center"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <Crosshair size={13} style={{ color: 'var(--tl-accent-primary)' }} />
            <span>View Detections &rarr;</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadAlerts(); loadKpis(); }}
            disabled={loading}
            title="Refresh alerts from backend"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`inline-feedback ${feedback.type}`} style={{
          padding: '0.55rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {feedback.text}
        </div>
      )}

      {!canWrite && (
        <div style={{
          background: 'var(--tl-bg-surface)',
          border: '1px solid var(--tl-border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 0.85rem',
          fontSize: '0.75rem',
          color: 'var(--tl-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Shield size={14} style={{ color: 'var(--tl-text-muted)' }} />
          <span><strong>Viewer Mode:</strong> You have read-only clearance. Acknowledging, assigning, resolving, or closing alerts requires Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        <KPICard
          label="Total Alerts"
          value={kpiStats.totalAlerts}
          sub="Across all detection rules"
          icon={Bell}
          variant="default"
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Active &amp; In-Progress"
          value={kpiStats.openAlerts}
          sub="Open, acknowledged & assigned"
          variant={kpiStats.openAlerts > 0 ? 'warning' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Critical Severity Queue"
          value={kpiStats.criticalCount}
          sub="Unresolved critical alerts"
          variant={kpiStats.criticalCount > 0 ? 'critical' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="High Severity Queue"
          value={kpiStats.highCount}
          sub="Unresolved high severity alerts"
          variant={kpiStats.highCount > 0 ? 'warning' : 'healthy'}
          loading={loading && totalElements === 0}
        />
      </div>

      {/* Precision Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={val => setSearchQuery(val)}
        searchPlaceholder="Filter loaded page by analyst, title, ID, or detection…"
        searchMaxWidth={360}
        hasActiveFilters={hasActiveFilters}
        onClear={clearAllFilters}
        resultCount={
          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
            Showing {filteredAlerts.length} of {totalElements} alerts
          </span>
        }
      >
        <select
          className="form-select form-select-sm"
          style={{ width: '150px', fontSize: '0.75rem' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          aria-label="Filter alerts by lifecycle status"
        >
          {STATUS_OPTS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          style={{ width: '175px', fontSize: '0.75rem' }}
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
          aria-label="Filter alerts by severity"
        >
          {SEVERITY_OPTS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterBar>

      {/* Main Table Panel */}
      <div className="panel" style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        background: 'var(--tl-bg-surface)',
        border: '1px solid var(--tl-border-default)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div className="data-table-wrap" style={{ flex: 1, overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--tl-bg-surface-nav, var(--tl-bg-surface))', borderBottom: '1px solid var(--tl-border-default)' }}>
                <th style={{ width: '130px', padding: '0.65rem 0.85rem' }}>Status</th>
                <th style={{ width: '90px', padding: '0.65rem 0.85rem' }}>Severity</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Alert Title &amp; Description</th>
                <th style={{ width: '160px', padding: '0.65rem 0.85rem' }}>Assigned Analyst</th>
                <th style={{ width: '175px', padding: '0.65rem 0.85rem' }}>Created (IST)</th>
                <th style={{ width: '80px', padding: '0.65rem 0.85rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '0.75rem 1rem' }}>
                      <div className="skeleton" style={{ height: '30px', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                  </tr>
                ))
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                      <Bell size={36} style={{ color: 'var(--tl-text-muted)', opacity: 0.5, margin: '0 auto 0.5rem' }} />
                      <div className="empty-state-title" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.3rem' }}>
                        {hasActiveFilters ? 'No Matching Alerts on This Page' : 'Alert Queue Nominal'}
                      </div>
                      <div className="empty-state-text" style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                        {hasActiveFilters
                          ? 'No alerts match your active filter criteria. Try resetting status or severity filters.'
                          : 'The operational alert queue is currently clear with no active escalations.'}
                      </div>
                      {hasActiveFilters && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '0.75rem' }}
                          onClick={clearAllFilters}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const isSel = selectedAlert?.id === alert.id;
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      style={{
                        cursor: 'pointer',
                        background: isSel ? 'var(--tl-bg-surface-elevated, var(--surface-elevated))' : undefined,
                        borderLeft: isSel ? '3px solid var(--tl-accent-primary)' : '3px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Status */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={alert.status || 'OPEN'} dot size="sm" />
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={alert.severity || 'LOW'} size="sm" />
                      </td>

                      {/* Title & Description */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--tl-text-primary)' }}>
                            {alert.title}
                          </span>
                          {alert.detectionId && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--tl-font-mono, monospace)',
                              color: 'var(--tl-text-muted)',
                              background: 'var(--tl-bg-surface-elevated)',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px'
                            }}>
                              Det: {alert.detectionId}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.74rem',
                          color: 'var(--tl-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '460px',
                          marginTop: '0.2rem'
                        }}>
                          {alert.description}
                        </div>
                      </td>

                      {/* Assigned Analyst */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {alert.assignedTo ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={12} style={{ color: 'var(--tl-accent-primary)' }} />
                            <strong>{alert.assignedTo}</strong>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Created (IST) */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.74rem',
                          color: 'var(--tl-text-secondary)'
                        }}>
                          {formatIST(alert.createdAt)}
                        </span>
                      </td>

                      {/* Triage action */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert); }}
                          style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Triage <ArrowRight size={11} />
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
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={newPage => setPage(newPage)}
          onPageSizeChange={newSize => { setPageSize(newSize); setPage(0); }}
          loading={loading}
          itemLabel="alerts"
        />
      </div>

      {/* Contextual Detail Triage Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.title || 'Alert Investigation'}
        subtitle={
          selectedAlert ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--tl-font-mono, monospace)', fontSize: '0.72rem' }}>
              <span>ID: {selectedAlert.id}</span>
              <button
                className="btn btn-ghost btn-icon btn-xs"
                onClick={() => handleCopy(selectedAlert.id, 'alert-id')}
                title="Copy Alert ID"
                style={{ padding: '0.1rem', height: 'auto' }}
              >
                {copiedId === 'alert-id' ? <CheckCheck size={11} style={{ color: 'var(--tl-sev-low)' }} /> : <Copy size={11} />}
              </button>
            </span>
          ) : null
        }
        badge={
          selectedAlert ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <StatusBadge status={selectedAlert.severity} size="sm" />
              <StatusBadge status={selectedAlert.status} dot size="sm" />
            </div>
          ) : null
        }
        width="540px"
      >
        {selectedAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Incident Escalation Banner / Case Card */}
            {linkedIncident ? (
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Linked Incident Case #{linkedIncident.id?.slice(-8) || linkedIncident.id}
                  </span>
                  <StatusBadge status={linkedIncident.status || 'OPEN'} dot size="xs" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                  {linkedIncident.title}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/incidents?incidentId=${linkedIncident.id}`)}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.2rem' }}
                >
                  <Flame size={13} style={{ color: 'var(--tl-sev-high)' }} /> Open Incident Case &rarr;
                </button>
              </div>
            ) : (
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    Major Security Incident?
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', marginTop: '0.1rem' }}>
                    Escalate this alert into a full incident investigation case.
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!canWrite || actionLoading}
                  onClick={() => openEscalateModal(selectedAlert)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                  title={!canWrite ? 'Analyst or Admin required to escalate' : 'Escalate alert to incident case'}
                >
                  <Flame size={13} style={{ color: 'var(--tl-sev-high)' }} /> Escalate &rarr;
                </button>
              </div>
            )}

            {/* Overview & Description */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Overview &amp; Triage Rationale
              </div>
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                fontSize: '0.76rem',
                color: 'var(--tl-text-secondary)',
                lineHeight: 1.5
              }}>
                {selectedAlert.description}
              </div>
            </div>

            {/* Originating Threat Detection Context Box */}
            {selectedAlert.detectionId && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Originating Threat Detection
                </div>

                {detectionLoading ? (
                  <div className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-sm)' }} />
                ) : detectionContext ? (
                  <div style={{
                    background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Rule Name</span>
                      <strong style={{ color: 'var(--tl-text-primary)' }}>{detectionContext.ruleName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Risk Assessment</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontWeight: 700,
                          color: detectionContext.riskScore >= 50 ? 'var(--tl-sev-high)' : 'var(--tl-text-primary)'
                        }}>
                          {detectionContext.riskScore} / 100
                        </span>
                        <StatusBadge status={detectionContext.riskCategory || 'LOW'} size="xs" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Detection Status</span>
                      <StatusBadge status={detectionContext.status} size="xs" />
                    </div>

                    {/* Critical Investigation Warnings based on Detection Lifecycle */}
                    {detectionContext.status === 'FALSE_POSITIVE' && (
                      <div style={{
                        marginTop: '0.2rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.72rem',
                        color: 'var(--tl-sev-high)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                        <span><strong>False Positive Notice:</strong> Originating detection was marked benign. You may close this alert.</span>
                      </div>
                    )}

                    {detectionContext.status === 'RESOLVED' && (
                      <div style={{
                        marginTop: '0.2rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.72rem',
                        color: 'var(--tl-sev-low)',
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
                      style={{ justifyContent: 'flex-start', padding: '0.3rem 0', marginTop: '0.2rem', fontSize: '0.74rem' }}
                    >
                      <Crosshair size={13} style={{ color: 'var(--tl-accent-primary)' }} /> View Detection in Detection Center &rarr;
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-muted)' }}>
                    Detection reference ID: <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{selectedAlert.detectionId}</span> (Payload archived or unavailable)
                  </div>
                )}
              </div>
            )}

            {/* Triggering Security Telemetry Event */}
            {(selectedAlert.logId || detectionContext?.logId) && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Triggering Security Telemetry Event
                </div>

                {logLoading ? (
                  <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-sm)' }} />
                ) : logContext ? (
                  <div style={{
                    background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--tl-border-subtle)', paddingBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Event Type</span>
                      <strong style={{ color: 'var(--tl-text-primary)' }}>{logContext.eventType}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Source IP</span>
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-sev-high)', fontWeight: 600 }}>
                        {logContext.sourceIp || '–'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Destination IP</span>
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                        {logContext.destinationIp || '–'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Source System</span>
                      <span>{logContext.sourceSystem}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Log Timestamp</span>
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                        {formatIST(logContext.timestamp)}
                      </span>
                    </div>
                    {logContext.message && (
                      <div style={{
                        marginTop: '0.3rem',
                        padding: '0.4rem 0.5rem',
                        background: 'var(--tl-bg-surface, #0B0D10)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--tl-font-mono, monospace)',
                        fontSize: '0.7rem',
                        color: 'var(--tl-text-primary)',
                        border: '1px solid var(--tl-border-subtle)'
                      }}>
                        {logContext.message}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-muted)' }}>
                    Log reference: <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{selectedAlert.logId || detectionContext?.logId}</span> (Payload archived)
                  </div>
                )}
              </div>
            )}

            {/* Alert Metadata */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Alert Details &amp; Assignment
              </div>
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.74rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Created (IST)</span>
                  <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                    {formatIST(selectedAlert.createdAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Updated (IST)</span>
                  <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                    {formatIST(selectedAlert.updatedAt) || '–'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Assigned To</span>
                  <span>
                    {selectedAlert.assignedTo ? (
                      <strong style={{ color: 'var(--tl-text-primary)' }}>{selectedAlert.assignedTo}</strong>
                    ) : (
                      <span style={{ color: 'var(--tl-text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </span>
                </div>
                {selectedAlert.acknowledgedBy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Acknowledged By</span>
                    <span>{selectedAlert.acknowledgedBy} ({formatIST(selectedAlert.acknowledgedAt)})</span>
                  </div>
                )}
                {selectedAlert.resolvedBy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Resolved By</span>
                    <span>{selectedAlert.resolvedBy} ({formatIST(selectedAlert.resolvedAt)})</span>
                  </div>
                )}
                {selectedAlert.resolutionNote && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem', paddingTop: '0.2rem', borderTop: '1px solid var(--tl-border-subtle)' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Resolution Note</span>
                    <span style={{ color: 'var(--tl-text-primary)', lineHeight: 1.4, fontSize: '0.72rem' }}>
                      {selectedAlert.resolutionNote}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Investigation Actions */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Lifecycle Investigation Actions
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedAlert.status === 'OPEN' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    title={!canWrite ? 'Analyst or Admin required' : 'Acknowledge alert'}
                    style={{ justifyContent: 'center' }}
                  >
                    <Check size={13} /> Acknowledge Alert
                  </button>
                )}

                {selectedAlert.status !== 'RESOLVED' && selectedAlert.status !== 'CLOSED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={actionLoading || !canWrite}
                      onClick={() => handleAssign(selectedAlert.id, user?.username || 'admin')}
                      title={!canWrite ? 'Analyst or Admin required' : 'Assign to current analyst'}
                      style={{ justifyContent: 'center' }}
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
                    padding: '0.65rem',
                    background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--tl-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                      Resolve with Remediation Note
                    </span>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      disabled={!canWrite}
                      placeholder={canWrite ? "Enter root cause, containment, or remediation notes…" : "Analyst required to resolve."}
                      value={resolveNote}
                      onChange={e => setResolveNote(e.target.value)}
                      style={{ marginBottom: '0.45rem', fontSize: '0.72rem', width: '100%' }}
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
                    style={{ justifyContent: 'center' }}
                  >
                    <Archive size={13} /> Close Alert Ticket
                  </button>
                )}

                {selectedAlert.status === 'CLOSED' && (
                  <div style={{
                    background: 'var(--tl-bg-surface-elevated)',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.74rem',
                    color: 'var(--tl-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Archive size={14} style={{ color: 'var(--tl-text-muted)', flexShrink: 0 }} />
                    <span>Alert is closed and archived. Lifecycle complete.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Escalate Alert to Incident Modal */}
      <Modal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="Escalate Alert to Incident Case"
        icon={<Flame size={16} style={{ color: 'var(--tl-sev-high)' }} />}
        confirmText="Open Incident Case"
        confirmLoading={actionLoading}
        confirmDisabled={!canWrite || !escalateForm.title.trim() || !escalateForm.description.trim()}
        onConfirm={handleEscalateSubmit}
        maxWidth="540px"
      >
        <form onSubmit={handleEscalateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{
            fontSize: '0.74rem',
            padding: '0.5rem 0.65rem',
            background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
            border: '1px solid var(--tl-border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--tl-text-secondary)'
          }}>
            Originating Alert: <strong style={{ color: 'var(--tl-text-primary)', fontFamily: 'var(--tl-font-mono, monospace)' }}>{selectedAlert?.id}</strong>
            {selectedAlert?.detectionId && (
              <span> &bull; Detection: <strong style={{ color: 'var(--tl-text-primary)', fontFamily: 'var(--tl-font-mono, monospace)' }}>{selectedAlert.detectionId}</strong></span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Incident Case Title *
            </label>
            <input
              type="text"
              className="form-input"
              value={escalateForm.title}
              onChange={e => setEscalateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Critical Brute Force on Production Gateway"
              required
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Severity *
              </label>
              <select
                className="form-select"
                value={escalateForm.severity}
                onChange={e => setEscalateForm(f => ({ ...f, severity: e.target.value }))}
                style={{ width: '100%', fontSize: '0.78rem' }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Assignee
              </label>
              <input
                type="text"
                className="form-input"
                value={escalateForm.assignedTo}
                onChange={e => setEscalateForm(f => ({ ...f, assignedTo: e.target.value }))}
                placeholder={user?.username || 'analyst'}
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Scope &amp; Description *
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              value={escalateForm.description}
              onChange={e => setEscalateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Scope, affected assets, initial triage notes…"
              required
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
