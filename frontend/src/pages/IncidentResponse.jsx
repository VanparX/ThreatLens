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
  Check,
  UserCheck,
  Archive,
  Send,
  Clock,
  User,
  ArrowRight,
  Plus,
  Terminal,
  Activity,
  Copy,
  CheckCheck,
  ExternalLink,
  Radar,
  Bell
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

export default function IncidentResponse({
  initialIncidents = null,
  initialKpiStats = null,
  initialSelectedIncident = null
} = {}) {
  const { user, canWrite } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Incidents Data & Pagination
  const [incidents, setIncidents] = useState(initialIncidents || []);
  const [loading, setLoading] = useState(initialIncidents === null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(initialIncidents ? initialIncidents.length : 0);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Incident & Contextual Entities
  const [selected, setSelected] = useState(initialSelectedIncident || null);
  const [alertContext, setAlertContext] = useState(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [detectionContext, setDetectionContext] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);

  // Actions, Inputs & Feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
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

  // Modal for Opening New Incident
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
  const [kpiStats, setKpiStats] = useState(initialKpiStats || {
    totalIncidents: initialIncidents ? initialIncidents.length : 0,
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

  const handleCopy = (text, idKey) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
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
  }, [page, pageSize, statusFilter, severityFilter]);

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
              THREATLENS // SOAR &amp; RESPONSE
            </span>
            <span className="bullet-sep" style={{ color: 'var(--tl-border-default)' }}>&bull;</span>
            <span className="badge badge-neutral" style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--tl-font-mono, monospace)',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}>
              ACTIVE INCIDENTS: {kpiStats.openCount + kpiStats.investigatingCount}
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
            Incident Response
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--tl-text-secondary)' }}>
            SOC incident investigation workspace, containment workflows, timeline notes, and response action tracking.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
            disabled={!canWrite}
            title={!canWrite ? 'Analyst or Admin required' : 'Open new incident case'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <Plus size={13} />
            <span>New Incident</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadIncidents(); loadKpis(); }}
            disabled={loading}
            title="Refresh incidents from backend"
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
          <span><strong>Viewer Mode:</strong> You have read-only clearance. Opening cases, updating lifecycle states, adding investigation notes, and recording response actions require Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem'
      }}>
        <KPICard
          label="Total Incidents"
          value={kpiStats.totalIncidents}
          sub="All historical & active cases"
          icon={Flame}
          variant="default"
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Open Queue"
          value={kpiStats.openCount}
          sub="Pending initial investigation"
          variant={kpiStats.openCount > 0 ? 'warning' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="In-Progress"
          value={kpiStats.investigatingCount}
          sub="Active triage & root cause analysis"
          variant={kpiStats.investigatingCount > 0 ? 'critical' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Contained"
          value={kpiStats.containedCount}
          sub="Containment action recorded"
          variant={kpiStats.containedCount > 0 ? 'warning' : 'neutral'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Resolved &amp; Closed"
          value={kpiStats.resolvedCount + kpiStats.closedCount}
          sub="Lifecycle completed cases"
          variant="healthy"
          loading={loading && totalElements === 0}
        />
      </div>

      {/* Precision Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={val => setSearchQuery(val)}
        searchPlaceholder="Filter page by title, description, analyst, ID, or alert…"
        searchMaxWidth={360}
        hasActiveFilters={hasActiveFilters}
        onClear={clearAllFilters}
        resultCount={
          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
            Showing {filteredIncidents.length} of {totalElements} incidents
          </span>
        }
      >
        <select
          className="form-select form-select-sm"
          style={{ width: '150px', fontSize: '0.75rem' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          aria-label="Filter incidents by lifecycle status"
        >
          {STATUS_OPTS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          style={{ width: '160px', fontSize: '0.75rem' }}
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
          aria-label="Filter incidents by severity"
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
                <th style={{ width: '120px', padding: '0.65rem 0.85rem' }}>Incident ID</th>
                <th style={{ width: '130px', padding: '0.65rem 0.85rem' }}>Status</th>
                <th style={{ width: '90px', padding: '0.65rem 0.85rem' }}>Severity</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Incident Title &amp; Scope</th>
                <th style={{ width: '130px', padding: '0.65rem 0.85rem' }}>Linked Alert</th>
                <th style={{ width: '140px', padding: '0.65rem 0.85rem' }}>Assignee</th>
                <th style={{ width: '175px', padding: '0.65rem 0.85rem' }}>Opened (IST)</th>
                <th style={{ width: '85px', padding: '0.65rem 0.85rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} style={{ padding: '0.75rem 1rem' }}>
                      <div className="skeleton" style={{ height: '30px', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                  </tr>
                ))
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                      <Flame size={36} style={{ color: 'var(--tl-text-muted)', opacity: 0.5, margin: '0 auto 0.5rem' }} />
                      <div className="empty-state-title" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.3rem' }}>
                        {hasActiveFilters ? 'No Matching Incidents on This Page' : 'Incident Queue Nominal'}
                      </div>
                      <div className="empty-state-text" style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                        {hasActiveFilters
                          ? 'No incidents match your active filter criteria. Try resetting status or severity filters.'
                          : 'There are currently no security incident cases recorded in the system.'}
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
                filteredIncidents.map(inc => {
                  const isSel = selected?.id === inc.id;
                  const shortId = inc.id ? `INC-${inc.id.slice(-8)}` : 'INC';
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelected(inc)}
                      style={{
                        cursor: 'pointer',
                        background: isSel ? 'var(--tl-bg-surface-elevated, var(--surface-elevated))' : undefined,
                        borderLeft: isSel ? '3px solid var(--tl-accent-primary)' : '3px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Incident ID */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.76rem',
                          color: 'var(--tl-text-primary)',
                          fontWeight: 600
                        }} title={inc.id}>
                          {shortId}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={inc.status || 'OPEN'} dot size="sm" />
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={inc.severity || 'HIGH'} size="sm" />
                      </td>

                      {/* Title & Scope */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--tl-text-primary)', fontSize: '0.82rem', marginBottom: '0.15rem' }}>
                          {inc.title}
                        </div>
                        <div style={{
                          fontSize: '0.74rem',
                          color: 'var(--tl-text-secondary)',
                          maxWidth: '440px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {inc.description}
                        </div>
                      </td>

                      {/* Linked Alert */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {inc.alertId ? (
                          <span style={{
                            fontFamily: 'var(--tl-font-mono, monospace)',
                            fontSize: '0.68rem',
                            color: 'var(--tl-accent-primary)',
                            background: 'var(--tl-bg-surface-elevated)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            border: '1px solid var(--tl-border-subtle)'
                          }} title={`Alert ID: ${inc.alertId}`}>
                            Alert: {inc.alertId.slice(-8)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>
                            Direct Case
                          </span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {inc.assignedTo ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={12} style={{ color: 'var(--tl-accent-primary)' }} />
                            <strong>{inc.assignedTo}</strong>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Opened (IST) */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.74rem',
                          color: 'var(--tl-text-secondary)'
                        }}>
                          {formatIST(inc.createdAt)}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => { e.stopPropagation(); setSelected(inc); }}
                          style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Investigate <ArrowRight size={11} />
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
          itemLabel="incidents"
        />
      </div>

      {/* Contextual Detail Investigation Workspace Drawer */}
      <DetailDrawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Incident Investigation'}
        subtitle={
          selected ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--tl-font-mono, monospace)', fontSize: '0.72rem' }}>
              <span>Case ID: {selected.id}</span>
              <button
                className="btn btn-ghost btn-icon btn-xs"
                onClick={() => handleCopy(selected.id, 'inc-id')}
                title="Copy Incident ID"
                style={{ padding: '0.1rem', height: 'auto' }}
              >
                {copiedId === 'inc-id' ? <CheckCheck size={11} style={{ color: 'var(--tl-sev-low)' }} /> : <Copy size={11} />}
              </button>
            </span>
          ) : null
        }
        badge={
          selected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <StatusBadge status={selected.severity} size="sm" />
              <StatusBadge status={selected.status} dot size="sm" />
            </div>
          ) : null
        }
        width="560px"
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Case Details & Scope */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Incident Scope &amp; Triage Description
              </div>
              <div style={{
                fontSize: '0.76rem',
                color: 'var(--tl-text-secondary)',
                lineHeight: 1.5,
                padding: '0.65rem 0.75rem',
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                whiteSpace: 'pre-wrap'
              }}>
                {selected.description}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.4rem',
                marginTop: '0.5rem',
                background: 'var(--tl-bg-surface-elevated)',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                fontSize: '0.72rem'
              }}>
                <div>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Created By:</span>{' '}
                  <strong style={{ color: 'var(--tl-text-primary)' }}>{selected.createdBy || 'system'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Opened (IST):</span>{' '}
                  <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selected.createdAt)}</span>
                </div>
                {selected.updatedAt && (
                  <div>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Last Updated:</span>{' '}
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selected.updatedAt)}</span>
                  </div>
                )}
                {selected.containedAt && (
                  <div>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Contained At:</span>{' '}
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selected.containedAt)}</span>
                  </div>
                )}
                {selected.closedAt && (
                  <div>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Closed At:</span>{' '}
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selected.closedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Connected SOC Telemetry & Artifacts */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Connected SOC Artifacts &amp; Telemetry
              </div>
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {selected.alertId ? (
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                        Originating Alert
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                        ID: {selected.alertId}
                        {alertContext?.status && ` • ${alertContext.status}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/alerts?alertId=${selected.alertId}`)}
                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Bell size={12} style={{ color: 'var(--tl-accent-primary)' }} /> View Alert &rarr;
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>
                    Direct incident case (no originating alert link).
                  </div>
                )}

                {(selected.detectionId || alertContext?.detectionId) && (
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                        Originating Threat Detection
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                        {selected.detectionId || alertContext?.detectionId}
                        {detectionContext?.ruleName && ` • ${detectionContext.ruleName}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/detections?detectionId=${selected.detectionId || alertContext?.detectionId}`)}
                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Radar size={12} style={{ color: 'var(--tl-accent-primary)' }} /> View Detection &rarr;
                    </button>
                  </div>
                )}

                {selected.relatedLogIds && selected.relatedLogIds.length > 0 && (
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                        Related Telemetry Logs ({selected.relatedLogIds.length})
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                        {selected.relatedLogIds.join(', ')}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/logs')}
                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Terminal size={12} style={{ color: 'var(--tl-accent-primary)' }} /> Inspect Logs &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Status & Transitions */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Lifecycle Status &amp; Transitions
              </div>
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>Current Status:</span>
                  <StatusBadge status={selected.status} dot size="sm" />
                </div>

                {selected.status === 'CONTAINED' && (
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--tl-text-secondary)',
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.65rem',
                    lineHeight: 1.45
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--tl-text-warning, #eab308)', marginBottom: '0.2rem' }}>
                      Containment action recorded.
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
                      Response action recorded in ThreatLens for investigation and audit purposes. No external infrastructure changes were executed.
                    </div>
                  </div>
                )}

                {/* Transition Actions based on backend validateStatusTransition rules */}
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
                    <div style={{ fontSize: '0.73rem', color: 'var(--tl-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Archive size={13} /> Incident case is closed and archived. Case history is locked.
                    </div>
                  )}
                </div>

                {/* Resolution Input Drawer Form */}
                {showResolveForm && (
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.65rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.3rem', display: 'block' }}>
                      Resolution &amp; Root Cause Summary
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={resolutionInput}
                      onChange={e => setResolutionInput(e.target.value)}
                      placeholder="Document containment verification, root cause, and remediation steps…"
                      style={{ fontSize: '0.74rem', marginBottom: '0.4rem', width: '100%' }}
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
                    padding: '0.55rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--tl-text-secondary)', marginBottom: '0.2rem' }}>
                      Resolution Summary
                    </div>
                    <div style={{ color: 'var(--tl-text-primary)', lineHeight: 1.4 }}>
                      {selected.resolutionSummary}
                    </div>
                    {selected.resolvedAt && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginTop: '0.3rem', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                        Resolved at: {formatIST(selected.resolvedAt)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Analyst Assignment */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Analyst Assignment
              </div>
              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>Currently Assigned</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    {selected.assignedTo || 'Unassigned'}
                  </div>
                </div>
                {canWrite && (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={actionLoading || !canWrite}
                      onClick={() => handleAssign(user?.username || 'admin')}
                      title="Assign to me"
                    >
                      <UserCheck size={12} /> Assign to me
                    </button>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Analyst username…"
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

            {/* Investigation Notes Timeline */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
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
                        background: 'var(--tl-bg-surface-elevated)',
                        border: '1px solid var(--tl-border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.55rem 0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                          {note.author || 'Analyst'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                          {formatIST(note.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {note.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--tl-text-muted)',
                    background: 'var(--tl-bg-surface-elevated)',
                    border: '1px solid var(--tl-border-default)',
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
                    <Send size={12} /> Note
                  </button>
                </form>
              )}
            </div>

            {/* Response Action Tracking (Simulated / Audited) */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Response Action Tracking ({selected.responseActions?.length || 0})
              </div>

              <div style={{
                fontSize: '0.7rem',
                color: 'var(--tl-text-muted)',
                marginBottom: '0.5rem',
                lineHeight: 1.4,
                padding: '0.45rem 0.6rem',
                background: 'var(--tl-bg-surface-elevated)',
                border: '1px solid var(--tl-border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <strong style={{ color: 'var(--tl-text-secondary)' }}>SOC Compliance Notice:</strong> Response action recorded in ThreatLens for investigation and audit purposes. No external infrastructure changes were executed.
              </div>

              {/* Record Action Form */}
              {canWrite && selected.status !== 'CLOSED' && (
                <form
                  onSubmit={handleRecordAction}
                  style={{
                    background: 'var(--tl-bg-surface-elevated)',
                    border: '1px solid var(--tl-border-default)',
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
                        background: 'var(--tl-bg-surface-elevated)',
                        borderLeft: '3px solid var(--tl-accent-primary)',
                        borderTop: '1px solid var(--tl-border-default)',
                        borderRight: '1px solid var(--tl-border-default)',
                        borderBottom: '1px solid var(--tl-border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                          {action.actionType} &rarr; <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{action.target}</span>
                        </span>
                        <span className="badge" style={{
                          fontSize: '0.62rem',
                          background: 'var(--tl-bg-surface)',
                          border: '1px solid var(--tl-border-subtle)',
                          color: 'var(--tl-text-muted)'
                        }}>
                          {action.mode || 'SIMULATED'}
                        </span>
                      </div>
                      {action.description && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', marginTop: '0.2rem' }}>
                          {action.description}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem' }}>
                        By: {action.performedBy || 'analyst'} &bull; <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{formatIST(action.performedAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '0.65rem',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--tl-text-muted)',
                    background: 'var(--tl-bg-surface-elevated)',
                    border: '1px solid var(--tl-border-default)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    No response actions recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Modal: Open New Incident Case */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Open New Incident Case"
        icon={<Flame size={16} style={{ color: 'var(--tl-sev-high)' }} />}
        confirmText="Open Incident Case"
        confirmLoading={actionLoading}
        confirmDisabled={!canWrite || !createForm.title.trim() || !createForm.description.trim()}
        onConfirm={handleCreateSubmit}
        maxWidth="540px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Incident Title *
            </label>
            <input
              type="text"
              className="form-input"
              value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Critical SSH Brute Force on Production Gateway"
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
                value={createForm.severity}
                onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value }))}
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
                value={createForm.assignedTo}
                onChange={e => setCreateForm(f => ({ ...f, assignedTo: e.target.value }))}
                placeholder={user?.username || 'analyst'}
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Originating Alert ID (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                value={createForm.alertId}
                onChange={e => setCreateForm(f => ({ ...f, alertId: e.target.value }))}
                placeholder="e.g. 660f... or alert ID"
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Detection ID (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                value={createForm.detectionId}
                onChange={e => setCreateForm(f => ({ ...f, detectionId: e.target.value }))}
                placeholder="e.g. det-..."
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Description &amp; Initial Findings *
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Scope, affected assets, indicators of compromise, initial findings…"
              required
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
