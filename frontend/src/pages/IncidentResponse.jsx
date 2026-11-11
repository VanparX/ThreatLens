import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Flame,
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
  Archive,
  Send,
  Clock,
  User,
  FileText,
  Radar,
  ArrowRight,
  Plus,
  Terminal,
  Activity,
  Lock,
  Ban,
  Key
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'CONTAINED', label: 'Contained' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' }
];

const SEVERITY_OPTS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' }
];

const ACTION_TEMPLATES = [
  { type: 'ACCOUNT_INVESTIGATION', label: 'Account Investigated', defaultTarget: 'compromised-account' },
  { type: 'IP_REVIEW', label: 'Suspicious IP Reviewed', defaultTarget: '198.51.100.200' },
  { type: 'HOST_ISOLATION', label: 'Host Isolated (Simulated)', defaultTarget: 'srv-prod-app01' },
  { type: 'CREDENTIAL_RESET', label: 'Credentials Reset (Simulated)', defaultTarget: 'svc_database_user' },
  { type: 'INCIDENT_ESCALATION', label: 'Incident Escalated', defaultTarget: 'tier-3-soc-team' },
  { type: 'CUSTOM', label: 'Other Investigation Action', defaultTarget: '' }
];

export default function IncidentResponse() {
  const { user, canWrite } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Incidents Data & Pagination
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Incident & Context
  const [selected, setSelected] = useState(null);
  const [alertContext, setAlertContext] = useState(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [detectionContext, setDetectionContext] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);

  // User Actions & Inputs
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [assignInput, setAssignInput] = useState('');
  const [noteText, setNoteText] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  // Response Action Form
  const [actionForm, setActionForm] = useState({
    actionType: 'ACCOUNT_INVESTIGATION',
    target: '',
    description: ''
  });

  // Modal for New Incident
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    assignedTo: '',
    alertId: '',
    detectionId: ''
  });

  // KPI Overview Metrics
  const [kpiStats, setKpiStats] = useState({
    totalIncidents: 0,
    openCount: 0,
    investigatingCount: 0,
    containedCount: 0,
    resolvedCount: 0,
    closedCount: 0
  });

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Load KPI overview metrics from /api/dashboard/stats
  const loadKpis = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      const d = res?.data ?? res;
      if (d) {
        const statusMap = d.incidentsByStatus || {};
        setKpiStats({
          totalIncidents: d.totalIncidents || 0,
          openCount: statusMap['OPEN'] || 0,
          investigatingCount: statusMap['INVESTIGATING'] || 0,
          containedCount: statusMap['CONTAINED'] || 0,
          resolvedCount: statusMap['RESOLVED'] || 0,
          closedCount: statusMap['CLOSED'] || 0
        });
      }
    } catch {
      // Fallback silently if stats call is unavailable
    }
  }, []);

  // Fetch paginated incidents with status and severity filters
  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize
      };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await api.get('/incidents', { params });
      const d = res?.data ?? res;
      const items = d?.content ?? (Array.isArray(d) ? d : []);
      setIncidents(items);
      setTotalPages(d?.totalPages || 1);
      setTotalElements(d?.totalElements ?? items.length);

      // Refresh selected incident in-memory if present in loaded batch
      if (selected) {
        const updated = items.find(i => i.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      toast('error', err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, severityFilter, selected?.id]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Handle URL deep-linking: ?incidentId=... or ?alertId=...
  useEffect(() => {
    const targetIncidentId = searchParams.get('incidentId');
    const targetAlertId = searchParams.get('alertId');

    if (targetIncidentId) {
      api.get(`/incidents/${targetIncidentId}`)
        .then(res => {
          const inc = res?.data ?? res;
          if (inc && inc.id) {
            setSelected(inc);
            toast('info', `Opened incident case ${inc.id}`);
          }
        })
        .catch(() => {
          toast('error', `Incident not found: ${targetIncidentId}`);
        });
    } else if (targetAlertId) {
      api.get(`/incidents/by-alert/${targetAlertId}`)
        .then(res => {
          const inc = res?.data ?? res;
          if (inc && inc.id) {
            setSelected(inc);
            toast('info', `Opened linked incident for alert ${targetAlertId}`);
          }
        })
        .catch(() => {
          // If no incident exists yet for this alert, notify analyst
          toast('info', `No existing incident linked to alert ${targetAlertId}`);
        });
    }
  }, [searchParams]);

  // Load originating Alert Context when selected incident has alertId
  useEffect(() => {
    let active = true;
    if (selected?.alertId) {
      setAlertLoading(true);
      api.get(`/alerts/${selected.alertId}`)
        .then(res => {
          if (!active) return;
          setAlertContext(res?.data ?? res);
        })
        .catch(() => {
          if (!active) return;
          setAlertContext(null);
        })
        .finally(() => {
          if (active) setAlertLoading(false);
        });
    } else {
      setAlertContext(null);
    }
    return () => { active = false; };
  }, [selected?.alertId]);

  // Load Detection Context when selected incident has detectionId (or from alertContext)
  useEffect(() => {
    let active = true;
    const targetDetId = selected?.detectionId || alertContext?.detectionId;
    if (targetDetId) {
      setDetectionLoading(true);
      api.get(`/detections/${targetDetId}`)
        .then(res => {
          if (!active) return;
          setDetectionContext(res?.data ?? res);
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
  }, [selected?.detectionId, alertContext?.detectionId]);

  // Lifecycle Status Transition Handler
  const handleStatusChange = async (newStatus, summary) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to update incident status');
      return;
    }
    setActionLoading(true);
    try {
      const params = { status: newStatus };
      if (summary) params.resolutionSummary = summary;
      const res = await api.put(`/incidents/${selected.id}/status`, null, { params });
      const updated = res?.data ?? res;
      toast('success', `Incident status transitioned to ${newStatus}`);
      setSelected(updated);
      setResolutionInput('');
      setShowResolveForm(false);
      loadIncidents();
      loadKpis();
    } catch (err) {
      toast('error', err.message || 'Failed to update incident status');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign Analyst Handler
  const handleAssign = async (targetAnalyst) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to assign incidents');
      return;
    }
    if (!targetAnalyst.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/incidents/${selected.id}/assign?analyst=${encodeURIComponent(targetAnalyst.trim())}`);
      const updated = res?.data ?? res;
      toast('success', `Incident assigned to ${targetAnalyst}`);
      setSelected(updated);
      setAssignInput('');
      loadIncidents();
      loadKpis();
    } catch (err) {
      toast('error', err.message || 'Failed to assign incident');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Investigation Note Handler
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to add investigation notes');
      return;
    }
    if (!noteText.trim() || !selected) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/incidents/${selected.id}/notes`, { content: noteText.trim() });
      const updated = res?.data ?? res;
      toast('success', 'Investigation note recorded');
      setNoteText('');
      setSelected(updated);
    } catch (err) {
      toast('error', err.message || 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Response Action Handler (Audited / Simulated)
  const handleRecordAction = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to record response actions');
      return;
    }
    if (!actionForm.target.trim() || !selected) {
      toast('error', 'Action target is required');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        actionType: actionForm.actionType,
        target: actionForm.target.trim(),
        description: actionForm.description.trim() || undefined
      };
      const res = await api.post(`/incidents/${selected.id}/actions`, payload);
      const updated = res?.data ?? res;
      toast('success', `Action recorded: ${actionForm.actionType} on ${actionForm.target}`);
      setActionForm(prev => ({ ...prev, target: '', description: '' }));
      setSelected(updated);
    } catch (err) {
      toast('error', err.message || 'Failed to record response action');
    } finally {
      setActionLoading(false);
    }
  };

  // Create New Incident Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to open incident cases');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        severity: createForm.severity,
        assignedTo: createForm.assignedTo.trim() || user?.username || 'analyst',
        alertId: createForm.alertId.trim() || undefined,
        detectionId: createForm.detectionId.trim() || undefined
      };
      const res = await api.post('/incidents', payload);
      const newInc = res?.data ?? res;
      toast('success', `Incident case ${newInc.id} created successfully`);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        severity: 'HIGH',
        assignedTo: '',
        alertId: '',
        detectionId: ''
      });
      loadIncidents();
      loadKpis();
      if (newInc?.id) setSelected(newInc);
    } catch (err) {
      toast('error', err.message || 'Failed to create incident case');
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side quick filter on current loaded batch
  const filteredIncidents = incidents.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.assignedTo && item.assignedTo.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.alertId && item.alertId.toLowerCase().includes(q)) ||
      (item.detectionId && item.detectionId.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 52px - 3rem)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
              <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
              {kpiStats.openCount + kpiStats.investigatingCount > 0
                ? `${kpiStats.openCount + kpiStats.investigatingCount} ACTIVE INCIDENTS`
                : 'INCIDENT QUEUE NOMINAL'}
            </span>
          </div>
          <h1 className="page-title">Incident Response</h1>
          <p className="page-subtitle">
            SOC incident investigation workspace, containment workflows, timeline notes, and response action tracking.
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
            style={{ width: '150px' }}
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
          >
            {SEVERITY_OPTS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
            disabled={!canWrite}
            title={!canWrite ? 'Analyst or Admin required' : 'Open new incident case'}
          >
            <Plus size={13} /> New Incident
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadIncidents(); loadKpis(); }}
            disabled={loading}
            title="Refresh incidents"
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
          <span><strong>Viewer Mode:</strong> You have read-only access to incident cases. Opening new cases, updating lifecycle states, adding notes, and recording response actions require Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total Incidents</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">{kpiStats.totalIncidents || totalElements}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cases</span>
          </div>
          <div className="kpi-sub">All historical &amp; active cases</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Open Queue</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.openCount > 0 ? 'var(--sev-high)' : 'var(--text-primary)' }}>
              {kpiStats.openCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>pending</span>
          </div>
          <div className="kpi-sub">Awaiting initial investigation</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">In-Progress</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.investigatingCount > 0 ? 'var(--sev-critical)' : 'var(--text-primary)' }}>
              {kpiStats.investigatingCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>investigating</span>
          </div>
          <div className="kpi-sub">Active triage &amp; root cause analysis</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Contained</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.containedCount > 0 ? 'var(--sev-medium)' : 'var(--text-primary)' }}>
              {kpiStats.containedCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mitigated</span>
          </div>
          <div className="kpi-sub">Threat perimeter isolated</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Resolved &amp; Closed</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: 'var(--status-online)' }}>
              {kpiStats.resolvedCount + kpiStats.closedCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>archived</span>
          </div>
          <div className="kpi-sub">Lifecycle completed cases</div>
        </div>
      </div>

      {/* Main Workspace (Table + Detail Drawer) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selected ? '1fr 470px' : '1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0
      }}>
        {/* Left Column: Incidents Table */}
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
            <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Filter loaded page (titles, IDs, analysts)…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                style={{ paddingLeft: '1.9rem', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Showing {filteredIncidents.length} of {incidents.length} on current page • {totalElements} total in database
            </div>
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '38px' }} />
                ))}
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Flame size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                {searchQuery.trim() && incidents.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Matching Incidents on This Page
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No incidents on current page match &ldquo;{searchQuery}&rdquo;. Clear filter or switch pages.
                    </div>
                  </>
                ) : statusFilter || severityFilter ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Incidents Match Selected Filters
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No incidents found matching status: {statusFilter || 'All'} and severity: {severityFilter || 'All'}.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Incident Queue Nominal
                    </div>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                      There are currently no security incident cases recorded in the system.
                    </div>
                    {canWrite && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                        <Plus size={13} /> Open New Incident Case
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Status</th>
                    <th style={{ width: '85px' }}>Severity</th>
                    <th>Incident Title &amp; Scope</th>
                    <th style={{ width: '120px' }}>Origin</th>
                    <th style={{ width: '125px' }}>Assignee</th>
                    <th style={{ width: '155px' }}>Opened (IST)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map(inc => {
                    const isSelected = selected?.id === inc.id;
                    const sev = (inc.severity || 'HIGH').toUpperCase();
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelected(inc)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--surface-elevated)' : undefined
                        }}
                      >
                        <td>
                          <span className={`status-pill ${inc.status?.toLowerCase()}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${sev.toLowerCase()}`}>
                            {sev}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: '0.1rem' }}>
                            {inc.title}
                          </div>
                          <div style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                            maxWidth: '360px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {inc.description}
                          </div>
                        </td>
                        <td>
                          {inc.alertId ? (
                            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
                              Alert Escalation
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Direct Case</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.76rem', color: inc.assignedTo ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                            {inc.assignedTo || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <span className="col-mono col-dim" style={{ fontSize: '0.73rem' }}>
                            {formatIST(inc.createdAt)}
                          </span>
                        </td>
                        <td>
                          <ChevronRight size={14} style={{ color: isSelected ? 'var(--sev-high)' : 'var(--text-muted)' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div style={{
            padding: '0.6rem 0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Page {page + 1} of {Math.max(1, totalPages)}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Incident Investigation Workspace (Drawer) */}
        {selected && (
          <div className="panel" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            minHeight: 0,
            overflowY: 'auto'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span className={`badge badge-${(selected.severity || 'high').toLowerCase()}`}>
                    {selected.severity}
                  </span>
                  <span className={`status-pill ${selected.status?.toLowerCase()}`}>
                    {selected.status}
                  </span>
                  <span className="col-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    INC-{selected.id?.slice(-8) || selected.id}
                  </span>
                </div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {selected.title}
                </h2>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelected(null)}
                title="Close drawer"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Connected SOC Artifacts (Alert & Detection Links) */}
              <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Connected SOC Artifacts
                </div>

                {selected.alertId ? (
                  <div style={{
                    padding: '0.5rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Originating Alert
                      </div>
                      <div className="col-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {selected.alertId}
                        {alertContext?.status && ` • ${alertContext.status}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/alerts?alertId=${selected.alertId}`)}
                      style={{ fontSize: '0.72rem' }}
                    >
                      View Alert <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Direct incident case (no originating alert link).
                  </div>
                )}

                {(selected.detectionId || alertContext?.detectionId) && (
                  <div style={{
                    padding: '0.5rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Originating Threat Detection
                      </div>
                      <div className="col-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {selected.detectionId || alertContext?.detectionId}
                        {detectionContext?.ruleName && ` • ${detectionContext.ruleName}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/detections?detectionId=${selected.detectionId || alertContext?.detectionId}`)}
                      style={{ fontSize: '0.72rem' }}
                    >
                      View Detection <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Lifecycle Status & Transitions */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Lifecycle Status &amp; Transitions</div>
                <div style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Status:</span>
                    <span className={`status-pill ${selected.status?.toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>

                  {/* Transition Actions based on backend validateStatusTransition logic */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selected.status === 'OPEN' && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('INVESTIGATING')}
                        >
                          <Activity size={12} /> Begin Investigation
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CONTAINED')}
                        >
                          <Shield size={12} /> Contain Incident
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => setShowResolveForm(true)}
                        >
                          <CheckCircle size={12} /> Resolve Incident
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CLOSED')}
                        >
                          <Archive size={12} /> Close Case
                        </button>
                      </>
                    )}

                    {selected.status === 'INVESTIGATING' && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CONTAINED')}
                        >
                          <Shield size={12} /> Contain Incident
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => setShowResolveForm(true)}
                        >
                          <CheckCircle size={12} /> Resolve Incident
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CLOSED')}
                        >
                          <Archive size={12} /> Close Case
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('OPEN')}
                        >
                          Revert to Open
                        </button>
                      </>
                    )}

                    {selected.status === 'CONTAINED' && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => setShowResolveForm(true)}
                        >
                          <CheckCircle size={12} /> Resolve Incident
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CLOSED')}
                        >
                          <Archive size={12} /> Close Case
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('OPEN')}
                        >
                          Reopen Case
                        </button>
                      </>
                    )}

                    {selected.status === 'RESOLVED' && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('CLOSED')}
                        >
                          <Archive size={12} /> Close &amp; Archive Case
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={actionLoading || !canWrite}
                          onClick={() => handleStatusChange('OPEN')}
                        >
                          Reopen Case
                        </button>
                      </>
                    )}

                    {selected.status === 'CLOSED' && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Archive size={13} /> Incident case is closed and archived. Case history is locked.
                      </div>
                    )}
                  </div>

                  {/* Resolution Input Drawer Form */}
                  {showResolveForm && (
                    <div style={{
                      marginTop: '0.4rem',
                      padding: '0.6rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <label className="form-label" style={{ marginBottom: '0.3rem' }}>
                        Resolution &amp; Root Cause Summary
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={resolutionInput}
                        onChange={e => setResolutionInput(e.target.value)}
                        placeholder="Document containment verification, root cause, and remediation steps…"
                        style={{ fontSize: '0.74rem', marginBottom: '0.4rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading}
                          onClick={() => handleStatusChange('RESOLVED', resolutionInput.trim() || undefined)}
                        >
                          Confirm Resolve
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowResolveForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Details when present */}
                  {selected.resolutionSummary && (
                    <div style={{
                      padding: '0.5rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.74rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        Resolution Summary
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        {selected.resolutionSummary}
                      </div>
                      {selected.resolvedAt && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                          Resolved at: {formatIST(selected.resolvedAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Analyst Assignment */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Analyst Assignment</div>
                <div style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Currently Assigned</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selected.assignedTo || 'Unassigned'}
                    </div>
                  </div>
                  {canWrite && (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder={user?.username || 'analyst'}
                        value={assignInput}
                        onChange={e => setAssignInput(e.target.value)}
                        style={{ width: '130px', fontSize: '0.72rem' }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={actionLoading || !assignInput.trim()}
                        onClick={() => handleAssign(assignInput.trim())}
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Case Details & Scope */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Case Details &amp; Scope</div>
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  padding: '0.65rem',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selected.description}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                  <div className="detail-row">
                    <span className="detail-key">Created By</span>
                    <span className="detail-val">{selected.createdBy || 'system'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Opened</span>
                    <span className="detail-val col-mono">{formatIST(selected.createdAt)}</span>
                  </div>
                  {selected.updatedAt && (
                    <div className="detail-row">
                      <span className="detail-key">Last Updated</span>
                      <span className="detail-val col-mono">{formatIST(selected.updatedAt)}</span>
                    </div>
                  )}
                  {selected.containedAt && (
                    <div className="detail-row">
                      <span className="detail-key">Contained At</span>
                      <span className="detail-val col-mono">{formatIST(selected.containedAt)}</span>
                    </div>
                  )}
                  {selected.closedAt && (
                    <div className="detail-row">
                      <span className="detail-key">Closed At</span>
                      <span className="detail-val col-mono">{formatIST(selected.closedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Investigation Notes Timeline */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">
                  Investigation Notes ({selected.notes?.length || 0})
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  marginBottom: '0.6rem'
                }}>
                  {selected.notes && selected.notes.length > 0 ? (
                    selected.notes.map((note, idx) => (
                      <div
                        key={note.id || idx}
                        style={{
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem 0.65rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {note.author || 'Analyst'}
                          </span>
                          <span className="col-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {formatIST(note.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      No investigation notes recorded yet.
                    </div>
                  )}
                </div>

                {canWrite && (
                  <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Add investigation observation or triage note…"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      style={{ flex: 1, fontSize: '0.74rem' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading || !noteText.trim()}
                    >
                      <Send size={12} />
                    </button>
                  </form>
                )}
              </div>

              {/* Response Action Tracking (Simulated / Audited) */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">
                  Response Action Tracking ({selected.responseActions?.length || 0})
                </div>

                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  lineHeight: 1.4
                }}>
                  * Actions are recorded for SOC audit compliance and incident timeline tracking. Recorded actions simulate response operations without modifying external production infrastructure.
                </div>

                {/* Record Action Form */}
                {canWrite && selected.status !== 'CLOSED' && (
                  <form
                    onSubmit={handleRecordAction}
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      marginBottom: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select
                        className="form-select form-select-sm"
                        value={actionForm.actionType}
                        onChange={e => {
                          const val = e.target.value;
                          const tpl = ACTION_TEMPLATES.find(t => t.type === val);
                          setActionForm(prev => ({
                            ...prev,
                            actionType: val,
                            target: tpl?.defaultTarget || prev.target
                          }));
                        }}
                        style={{ flex: 1, fontSize: '0.72rem' }}
                      >
                        {ACTION_TEMPLATES.map(tpl => (
                          <option key={tpl.type} value={tpl.type}>{tpl.label}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="Target (IP, user, host)…"
                        value={actionForm.target}
                        onChange={e => setActionForm(prev => ({ ...prev, target: e.target.value }))}
                        required
                        style={{ flex: 1, fontSize: '0.72rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="Description / scope notes…"
                        value={actionForm.description}
                        onChange={e => setActionForm(prev => ({ ...prev, description: e.target.value }))}
                        style={{ flex: 1, fontSize: '0.72rem' }}
                      />
                      <button
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={actionLoading || !actionForm.target.trim()}
                        style={{ fontSize: '0.72rem' }}
                      >
                        Record Action
                      </button>
                    </div>
                  </form>
                )}

                {/* Recorded Actions History */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {selected.responseActions && selected.responseActions.length > 0 ? (
                    selected.responseActions.map((action, idx) => (
                      <div
                        key={action.id || idx}
                        style={{
                          background: 'var(--surface-elevated)',
                          borderLeft: '3px solid var(--sev-high)',
                          borderTop: '1px solid var(--border-subtle)',
                          borderRight: '1px solid var(--border-subtle)',
                          borderBottom: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.45rem 0.6rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {action.actionType} &rarr; <span className="col-mono">{action.target}</span>
                          </span>
                          <span className="badge badge-low" style={{ fontSize: '0.62rem' }}>
                            {action.mode || 'SIMULATED'}
                          </span>
                        </div>
                        {action.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {action.description}
                          </div>
                        )}
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          By: {action.performedBy || 'analyst'} &bull; {formatIST(action.performedAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '0.65rem',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      No response actions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Open New Incident Case */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={16} style={{ color: 'var(--sev-high)' }} /> Open New Incident Case
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Incident Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Critical SSH Brute Force on Production Gateway"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Severity *</label>
                    <select
                      className="form-select"
                      value={createForm.severity}
                      onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value }))}
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
                      value={createForm.assignedTo}
                      onChange={e => setCreateForm(f => ({ ...f, assignedTo: e.target.value }))}
                      placeholder={user?.username || 'analyst'}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Originating Alert ID (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={createForm.alertId}
                      onChange={e => setCreateForm(f => ({ ...f, alertId: e.target.value }))}
                      placeholder="e.g. 660f... or alert ID"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Detection ID (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={createForm.detectionId}
                      onChange={e => setCreateForm(f => ({ ...f, detectionId: e.target.value }))}
                      placeholder="e.g. det-..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description &amp; Initial Findings *</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Scope, affected endpoints, indicators of compromise, initial findings…"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
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
