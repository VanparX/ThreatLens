import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  FileText,
  Terminal,
  Check,
  AlertOctagon,
  Clock,
  Flame,
  Zap,
  Tag,
  Crosshair,
  Server
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

function getScoreColor(score) {
  if (score >= 75) return 'var(--sev-critical)';
  if (score >= 50) return 'var(--sev-high)';
  if (score >= 25) return 'var(--sev-medium)';
  return 'var(--sev-low)';
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case 'CRITICAL': return 'badge-critical';
    case 'HIGH':     return 'badge-high';
    case 'MEDIUM':   return 'badge-medium';
    case 'LOW':      return 'badge-low';
    default:         return 'badge-neutral';
  }
}

function getStatusPillClass(status) {
  switch (status) {
    case 'NEW':            return 'status-pill new';
    case 'ACKNOWLEDGED':   return 'status-pill acknowledged';
    case 'ALERT_CREATED':  return 'status-pill active';
    case 'RESOLVED':       return 'status-pill resolved';
    case 'FALSE_POSITIVE': return 'status-pill disabled';
    default:               return 'status-pill neutral';
  }
}

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'ALERT_CREATED', label: 'Alert Created' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' }
];

const CATEGORY_OPTS = [
  { value: '', label: 'All Risk Categories' },
  { value: 'CRITICAL', label: 'Critical Risk (≥75)' },
  { value: 'HIGH', label: 'High Risk (50-74)' },
  { value: 'MEDIUM', label: 'Medium Risk (25-49)' },
  { value: 'LOW', label: 'Low Risk (<25)' }
];

export default function DetectionCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, canWrite } = useAuth();

  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item & related log
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [relatedLog, setRelatedLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false);

  // High-level KPI metrics
  const [kpiStats, setKpiStats] = useState({
    totalDetections: 0,
    openDetections: 0,
    criticalCount: 0,
    highCount: 0,
    activeRules: 0
  });

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Load KPI overview
  const loadKpis = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      const d = res?.data ?? res;
      if (d) {
        const catMap = d.detectionsByCategory || {};
        setKpiStats({
          totalDetections: d.totalDetections || 0,
          openDetections: d.openDetections || 0,
          criticalCount: catMap['CRITICAL'] || 0,
          highCount: catMap['HIGH'] || 0,
          activeRules: d.activeRules ?? 0
        });
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  // Fetch paginated detections
  const loadDetections = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/detections', { params });
      const d = res?.data ?? res;
      const items = d?.content ?? (Array.isArray(d) ? d : []);
      setDetections(items);
      setTotalPages(d?.totalPages || 1);
      setTotalElements(d?.totalElements ?? items.length);

      // Refresh selection if still in view
      if (selectedDetection) {
        const updated = items.find(item => item.id === selectedDetection.id);
        if (updated) setSelectedDetection(updated);
      }
    } catch (err) {
      toast('error', err.message || 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter, selectedDetection?.id]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    loadDetections();
  }, [page, pageSize, statusFilter, categoryFilter]);

  // Handle direct navigation via ?detectionId=...
  useEffect(() => {
    const targetDetectionId = searchParams.get('detectionId');
    if (targetDetectionId) {
      api.get(`/detections/${targetDetectionId}`)
        .then(res => {
          const d = res?.data ?? res;
          if (d && d.id) {
            setSelectedDetection(d);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Load associated log telemetry when drawer opens
  useEffect(() => {
    let active = true;
    if (selectedDetection?.logId) {
      setLogLoading(true);
      api.get(`/logs/${selectedDetection.logId}`)
        .then(res => {
          if (!active) return;
          const logData = res?.data ?? res;
          setRelatedLog(logData);
        })
        .catch(() => {
          if (!active) return;
          setRelatedLog(null);
        })
        .finally(() => {
          if (active) setLogLoading(false);
        });
    } else {
      setRelatedLog(null);
    }
    return () => { active = false; };
  }, [selectedDetection?.logId]);

  // Status mutation action
  const handleUpdateStatus = async (detectionId, newStatus) => {
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to update detection status');
      return;
    }
    setActionLoading(true);
    try {
      // Backend Contract: PUT /api/detections/{id}/status?status={status}
      const res = await api.put(`/detections/${detectionId}/status?status=${newStatus}`);
      const updated = res?.data ?? res;
      toast('success', `Detection marked as ${newStatus}`);
      loadDetections();
      loadKpis();
      if (selectedDetection?.id === detectionId) {
        setSelectedDetection(updated || { ...selectedDetection, status: newStatus });
      }
    } catch (err) {
      toast('error', err.message || 'Failed to update detection status');
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side quick filter on rule name or reason
  const filteredDetections = detections.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.ruleName && item.ruleName.toLowerCase().includes(q)) ||
      (item.matchReason && item.matchReason.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
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
              {kpiStats.activeRules > 0 ? `${kpiStats.activeRules} ACTIVE RULES ARMED` : 'DETECTION ENGINE ACTIVE'}
            </span>
          </div>
          <h1 className="page-title">Threat Detections</h1>
          <p className="page-subtitle">
            Heuristic detection evaluations, risk scoring calculations, and behavioral rule match evidence.
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
            style={{ width: '175px' }}
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
          >
            {CATEGORY_OPTS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadDetections(); loadKpis(); }}
            disabled={loading}
            title="Refresh detections"
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
          <span><strong>Viewer Mode:</strong> You have read-only access to threat detections. Updating lifecycle statuses and triaging alerts requires Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total Detections</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">{kpiStats.totalDetections || totalElements}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>rule matches</span>
          </div>
          <div className="kpi-sub">Across all behavioral correlation rules</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active Detections</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.openDetections > 0 ? 'var(--sev-high)' : 'var(--text-primary)' }}>
              {kpiStats.openDetections}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>unresolved</span>
          </div>
          <div className="kpi-sub">New, acknowledged &amp; alert-created states</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">High &amp; Critical Threat Rate</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: (kpiStats.criticalCount + kpiStats.highCount) > 0 ? 'var(--sev-critical)' : 'var(--status-online)' }}>
              {kpiStats.criticalCount + kpiStats.highCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({kpiStats.criticalCount} crit / {kpiStats.highCount} high)
            </span>
          </div>
          <div className="kpi-sub">Risk score threshold ≥ 50 / 100</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active Rules Armed</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.activeRules > 0 ? 'var(--status-online)' : 'var(--text-muted)' }}>
              {kpiStats.activeRules}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>enabled rules</span>
            <span className="badge badge-low" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              {kpiStats.activeRules > 0 ? 'ARMED' : 'STANDBY'}
            </span>
          </div>
          <div className="kpi-sub">Behavioral detection rules actively evaluating ingested logs</div>
        </div>
      </div>

      {/* Main Workspace (Table + Detail Drawer) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedDetection ? '1fr 440px' : '1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0
      }}>
        {/* Table Panel */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Table Header Controls */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}>
            <div className="search-wrap" style={{ maxWidth: '320px', flex: 1 }}>
              <Search size={13} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Filter by rule name or reason…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.78rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Show:</span>
              <select
                className="form-select"
                style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="data-table-wrap" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Risk Score</th>
                  <th style={{ width: '85px' }}>Severity</th>
                  <th>Detection Rule &amp; Match Evidence</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '155px' }}>Detected Time (IST)</th>
                  <th style={{ width: '75px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} style={{ padding: '0.75rem 1rem' }}>
                        <div className="skeleton" style={{ height: '28px', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                    </tr>
                  ))
                ) : filteredDetections.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: '3.5rem 1.5rem' }}>
                        <Crosshair size={36} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        <div className="empty-state-title">No threat detections on record</div>
                        <div className="empty-state-text">
                          {statusFilter || categoryFilter || searchQuery
                            ? 'No detections match your current filter criteria. Try resetting status or risk category filters.'
                            : 'The heuristic engine has not matched any events against active correlation rules yet.'}
                        </div>
                        {(statusFilter || categoryFilter || searchQuery) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '0.75rem' }}
                            onClick={() => { setStatusFilter(''); setCategoryFilter(''); setSearchQuery(''); }}
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDetections.map(det => {
                    const isSel = selectedDetection?.id === det.id;
                    const score = det.riskScore || 0;
                    const barColor = getScoreColor(score);
                    return (
                      <tr
                        key={det.id}
                        onClick={() => setSelectedDetection(det)}
                        style={{
                          cursor: 'pointer',
                          background: isSel ? 'var(--surface-elevated)' : undefined,
                          borderLeft: isSel ? `3px solid ${barColor}` : '3px solid transparent'
                        }}
                      >
                        {/* Risk score & bar */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: barColor }}>
                                {score}
                              </span>
                              <span className={`badge ${getCategoryBadgeClass(det.riskCategory)}`} style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem' }}>
                                {det.riskCategory || 'LOW'}
                              </span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '4px',
                              background: 'var(--surface-elevated)',
                              borderRadius: '2px',
                              overflow: 'hidden'
                            }}>
                              <div style={{ width: `${Math.min(100, Math.max(5, score))}%`, height: '100%', background: barColor }} />
                            </div>
                          </div>
                        </td>

                        {/* Severity */}
                        <td>
                          <span className={`badge badge-${(det.severity || 'low').toLowerCase()}`}>
                            {det.severity || 'INFO'}
                          </span>
                        </td>

                        {/* Rule & Match reason */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.814rem' }}>
                            {det.ruleName || 'Unnamed Heuristic Rule'}
                          </div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.15rem',
                              maxWidth: '420px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={det.matchReason}
                          >
                            {det.matchReason || 'Pattern match criteria satisfied'}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={getStatusPillClass(det.status)}>
                            {det.status?.replace('_', ' ') || 'NEW'}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="col-mono col-dim" style={{ fontSize: '0.74rem' }}>
                          {formatIST(det.detectedAt)}
                        </td>

                        {/* Inspect action */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={(e) => { e.stopPropagation(); setSelectedDetection(det); }}
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div style={{
            padding: '0.65rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              Showing {totalElements === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} detections
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn btn-secondary btn-xs"
                disabled={page <= 0 || loading}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', padding: '0 0.35rem' }}>
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <button
                className="btn btn-secondary btn-xs"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Detail Inspection Drawer */}
        {selectedDetection && (
          <div className="panel" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1.1rem',
            overflowY: 'auto'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span className={`badge badge-${(selectedDetection.severity || 'low').toLowerCase()}`}>
                    {selectedDetection.severity}
                  </span>
                  <span className={getStatusPillClass(selectedDetection.status)}>
                    {selectedDetection.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedDetection.ruleName}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedDetection(null)}
                aria-label="Close drawer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Risk Score Spotlight Card */}
            <div style={{
              background: 'var(--surface-elevated)',
              border: `1px solid var(--border)`,
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  DETERMINISTIC RISK SCORE
                </span>
                <span className={`badge ${getCategoryBadgeClass(selectedDetection.riskCategory)}`}>
                  {selectedDetection.riskCategory} RISK
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: getScoreColor(selectedDetection.riskScore)
                }}>
                  {selectedDetection.riskScore}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100 max</span>
              </div>

              {/* Progress gauge */}
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--surface-base)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.max(5, selectedDetection.riskScore))}%`,
                  height: '100%',
                  background: getScoreColor(selectedDetection.riskScore)
                }} />
              </div>

              {/* Score Reasons breakdown */}
              {selectedDetection.scoreReasons && selectedDetection.scoreReasons.length > 0 && (
                <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Score Formulation Rationale:
                  </div>
                  {selectedDetection.scoreReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.72rem',
                        background: 'var(--surface-panel)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        borderLeft: '2px solid var(--accent)'
                      }}
                    >
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match Evidence Section */}
            <div className="detail-section">
              <div className="detail-section-title">Detection Rule Match Reason</div>
              <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.45
              }}>
                {selectedDetection.matchReason}
              </div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Rule ID: <span className="col-mono">{selectedDetection.ruleId}</span>
              </div>
            </div>

            {/* Associated Telemetry Security Log Envelope */}
            <div className="detail-section">
              <div className="detail-section-title">Triggering Security Telemetry Event</div>
              {logLoading ? (
                <div className="skeleton" style={{ height: '90px' }} />
              ) : relatedLog ? (
                <div style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Event Type</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{relatedLog.eventType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Source IP</span>
                    <span className="col-mono" style={{ color: 'var(--sev-high)' }}>{relatedLog.sourceIp || '–'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Destination IP</span>
                    <span className="col-mono">{relatedLog.destinationIp || '–'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Source System</span>
                    <span style={{ color: 'var(--text-primary)' }}>{relatedLog.sourceSystem}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Log Timestamp</span>
                    <span className="col-mono col-dim">{formatIST(relatedLog.timestamp)}</span>
                  </div>

                  <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Payload Message</span>
                    <div style={{
                      background: 'var(--surface-base)',
                      padding: '0.4rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {relatedLog.message}
                    </div>
                  </div>

                  {relatedLog.metadata && Object.keys(relatedLog.metadata).length > 0 && (
                    <div style={{ marginTop: '0.3rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Event Metadata</span>
                      <pre style={{
                        margin: 0,
                        background: 'var(--surface-base)',
                        padding: '0.4rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        maxHeight: '110px',
                        overflowY: 'auto'
                      }}>
                        {JSON.stringify(relatedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Log reference ID: <span className="col-mono">{selectedDetection.logId}</span> (Log payload archived or unavailable)
                </div>
              )}
            </div>

            {/* Lifecycle Metadata */}
            <div className="detail-section">
              <div className="detail-section-title">Detection Lifecycle</div>
              <div className="detail-row">
                <span className="detail-key">Detection ID</span>
                <span className="detail-val col-mono">{selectedDetection.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">First Evaluated</span>
                <span className="detail-val col-mono">{formatIST(selectedDetection.detectedAt)}</span>
              </div>
              {selectedDetection.resolvedAt && (
                <div className="detail-row">
                  <span className="detail-key">Resolved At</span>
                  <span className="detail-val col-mono">{formatIST(selectedDetection.resolvedAt)}</span>
                </div>
              )}
              {selectedDetection.resolvedBy && (
                <div className="detail-row">
                  <span className="detail-key">Resolved By</span>
                  <span className="detail-val">{selectedDetection.resolvedBy}</span>
                </div>
              )}
            </div>

            {/* Investigation & Triage Actions */}
            <div className="detail-section">
              <div className="detail-section-title">Investigation &amp; Triage Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(selectedDetection.status === 'NEW' || selectedDetection.status === 'ALERT_CREATED') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleUpdateStatus(selectedDetection.id, 'ACKNOWLEDGED')}
                    title={!canWrite ? 'Analyst or Admin required' : 'Acknowledge detection'}
                  >
                    <Check size={13} /> Acknowledge Detection
                  </button>
                )}

                {(selectedDetection.status === 'NEW' || selectedDetection.status === 'ACKNOWLEDGED' || selectedDetection.status === 'ALERT_CREATED') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleUpdateStatus(selectedDetection.id, 'RESOLVED')}
                    title={!canWrite ? 'Analyst or Admin required' : 'Mark detection as resolved'}
                  >
                    <CheckCircle size={13} style={{ color: 'var(--sev-low)' }} /> Mark Resolved
                  </button>
                )}

                {(selectedDetection.status === 'NEW' || selectedDetection.status === 'ACKNOWLEDGED' || selectedDetection.status === 'ALERT_CREATED') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleUpdateStatus(selectedDetection.id, 'FALSE_POSITIVE')}
                    title={!canWrite ? 'Analyst or Admin required' : 'Classify as false positive'}
                  >
                    <ShieldAlert size={13} style={{ color: 'var(--text-muted)' }} /> Mark as False Positive
                  </button>
                )}

                {selectedDetection.status === 'RESOLVED' && (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={14} style={{ color: 'var(--status-online)', flexShrink: 0 }} />
                    <span>Detection resolved{selectedDetection.resolvedBy ? ` by ${selectedDetection.resolvedBy}` : ''}. Lifecycle complete.</span>
                  </div>
                )}

                {selectedDetection.status === 'FALSE_POSITIVE' && (
                  <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <ShieldAlert size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>Classified as false positive. Correlation suppressed.</span>
                  </div>
                )}

                {selectedDetection.status === 'ALERT_CREATED' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/alerts?detectionId=${selectedDetection.id}`)}
                  >
                    <Flame size={13} /> View Alert in Alert Center →
                  </button>
                )}

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/logs')}
                  style={{ justifyContent: 'flex-start' }}
                >
                  <Terminal size={13} /> Open In Log Explorer →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

