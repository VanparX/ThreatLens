import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Terminal,
  Check,
  Flame,
  Crosshair,
  Bell,
  Copy,
  CheckCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';
import {
  KPICard,
  StatusBadge,
  TablePagination,
  DetailDrawer,
  FilterBar
} from '../components/common';

function getScoreColor(score) {
  if (score >= 75) return 'var(--tl-sev-critical)';
  if (score >= 50) return 'var(--tl-sev-high)';
  if (score >= 25) return 'var(--tl-sev-medium)';
  return 'var(--tl-sev-low)';
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

export default function DetectionCenter({
  initialDetections = null,
  initialKpiStats = null,
  initialSelectedDetection = null
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, canWrite } = useAuth();

  const [detections, setDetections] = useState(initialDetections || []);
  const [loading, setLoading] = useState(initialDetections === null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(initialDetections ? initialDetections.length : 0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item & related log
  const [selectedDetection, setSelectedDetection] = useState(initialSelectedDetection || null);
  const [relatedLog, setRelatedLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false);

  // High-level KPI overview
  const [kpiStats, setKpiStats] = useState(initialKpiStats || {
    totalDetections: initialDetections ? initialDetections.length : 0,
    openDetections: 0,
    criticalCount: 0,
    highCount: 0,
    activeRules: 0
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

  // Client-side quick filter on rule name, reason, or ID
  const filteredDetections = detections.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.ruleName && item.ruleName.toLowerCase().includes(q)) ||
      (item.matchReason && item.matchReason.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
    );
  });

  const clearAllFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchQuery('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(statusFilter || categoryFilter || searchQuery);

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
              THREATLENS // TELEMETRY &amp; HEURISTICS
            </span>
            <span className="bullet-sep" style={{ color: 'var(--tl-border-default)' }}>&bull;</span>
            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
              <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
              {kpiStats.activeRules > 0 ? `${kpiStats.activeRules} ACTIVE RULES ARMED` : 'DETECTION ENGINE ACTIVE'}
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
            Threat Detection Center
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--tl-text-secondary)' }}>
            Heuristic detection evaluations, risk scoring calculations, and behavioral rule match evidence.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/alerts')}
            title="Navigate to Alert Triage Center"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <Bell size={13} style={{ color: 'var(--tl-accent-primary)' }} />
            <span>View Alert Center &rarr;</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadDetections(); loadKpis(); }}
            disabled={loading}
            title="Refresh detections from backend"
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
          <span><strong>Viewer Mode:</strong> You have read-only clearance. Updating detection statuses and acknowledging threats requires Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        <KPICard
          label="Total Detections"
          value={kpiStats.totalDetections}
          sub="Across all behavioral rules"
          icon={Crosshair}
          variant="default"
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Active Detections"
          value={kpiStats.openDetections}
          sub="New, acknowledged & alert-created"
          variant={kpiStats.openDetections > 0 ? 'warning' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Elevated Threat Rate"
          value={kpiStats.criticalCount + kpiStats.highCount}
          sub={`${kpiStats.criticalCount} critical / ${kpiStats.highCount} high risk (≥50)`}
          variant={(kpiStats.criticalCount + kpiStats.highCount) > 0 ? 'critical' : 'healthy'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Active Rules Armed"
          value={kpiStats.activeRules}
          sub="Heuristic rules actively evaluating"
          badge={kpiStats.activeRules > 0 ? 'ARMED' : 'STANDBY'}
          badgeVariant={kpiStats.activeRules > 0 ? 'low' : 'neutral'}
          variant={kpiStats.activeRules > 0 ? 'healthy' : 'neutral'}
          loading={loading && totalElements === 0}
        />
      </div>

      {/* Precision Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={val => setSearchQuery(val)}
        searchPlaceholder="Filter loaded page by rule name, reason, or ID…"
        searchMaxWidth={360}
        hasActiveFilters={hasActiveFilters}
        onClear={clearAllFilters}
        resultCount={
          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
            Showing {filteredDetections.length} of {totalElements} detections
          </span>
        }
      >
        <select
          className="form-select form-select-sm"
          style={{ width: '150px', fontSize: '0.75rem' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          aria-label="Filter detections by lifecycle status"
        >
          {STATUS_OPTS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          style={{ width: '180px', fontSize: '0.75rem' }}
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
          aria-label="Filter detections by risk category"
        >
          {CATEGORY_OPTS.map(opt => (
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
                <th style={{ width: '140px', padding: '0.65rem 0.85rem' }}>Risk Score</th>
                <th style={{ width: '90px', padding: '0.65rem 0.85rem' }}>Severity</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Detection Rule &amp; Match Evidence</th>
                <th style={{ width: '135px', padding: '0.65rem 0.85rem' }}>Status</th>
                <th style={{ width: '175px', padding: '0.65rem 0.85rem' }}>Detected Time (IST)</th>
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
              ) : filteredDetections.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                      <Crosshair size={36} style={{ color: 'var(--tl-text-muted)', opacity: 0.5, margin: '0 auto 0.5rem' }} />
                      <div className="empty-state-title" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.3rem' }}>
                        No threat detections on record
                      </div>
                      <div className="empty-state-text" style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                        {hasActiveFilters
                          ? 'No detections match your current filter criteria. Try resetting status or risk category filters.'
                          : 'The heuristic engine has not matched any events against active correlation rules yet.'}
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
                filteredDetections.map(det => {
                  const isSel = selectedDetection?.id === det.id;
                  const score = det.riskScore || 0;
                  const scoreColor = getScoreColor(score);
                  return (
                    <tr
                      key={det.id}
                      onClick={() => setSelectedDetection(det)}
                      style={{
                        cursor: 'pointer',
                        background: isSel ? 'var(--tl-bg-surface-elevated, var(--surface-elevated))' : undefined,
                        borderLeft: isSel ? `3px solid ${scoreColor}` : '3px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Risk score & mini meter */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              fontWeight: 700,
                              fontFamily: 'var(--tl-font-mono, monospace)',
                              fontSize: '0.85rem',
                              color: scoreColor
                            }}>
                              {score}
                            </span>
                            <span className="badge" style={{
                              fontSize: '0.62rem',
                              padding: '0.05rem 0.35rem',
                              background: 'var(--tl-bg-surface-elevated)',
                              border: '1px solid var(--tl-border-subtle)',
                              color: scoreColor,
                              fontWeight: 600
                            }}>
                              {det.riskCategory || 'LOW'}
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'var(--tl-bg-surface-elevated, #1B222C)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(6, score))}%`,
                              height: '100%',
                              background: scoreColor
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={det.severity || 'LOW'} size="sm" />
                      </td>

                      {/* Rule & Match reason */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)', fontSize: '0.82rem' }}>
                            {det.ruleName || 'Unnamed Heuristic Rule'}
                          </span>
                          {det.ruleId && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontFamily: 'var(--tl-font-mono, monospace)',
                              color: 'var(--tl-text-muted)',
                              background: 'var(--tl-bg-surface-elevated)',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px'
                            }}>
                              {det.ruleId}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--tl-text-secondary)',
                            marginTop: '0.2rem',
                            maxWidth: '460px',
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
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={det.status || 'NEW'} dot size="sm" />
                      </td>

                      {/* Detected Timestamp */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.74rem',
                          color: 'var(--tl-text-secondary)'
                        }}>
                          {formatIST(det.detectedAt)}
                        </span>
                      </td>

                      {/* Inspect action */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => { e.stopPropagation(); setSelectedDetection(det); }}
                          style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Inspect <ArrowRight size={11} />
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
          itemLabel="detections"
        />
      </div>

      {/* Contextual Detail Inspection Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedDetection)}
        onClose={() => setSelectedDetection(null)}
        title={selectedDetection?.ruleName || 'Detection Details'}
        subtitle={
          selectedDetection ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--tl-font-mono, monospace)', fontSize: '0.72rem' }}>
              <span>ID: {selectedDetection.id}</span>
              <button
                className="btn btn-ghost btn-icon btn-xs"
                onClick={() => handleCopy(selectedDetection.id, 'det-id')}
                title="Copy Detection ID"
                style={{ padding: '0.1rem', height: 'auto' }}
              >
                {copiedId === 'det-id' ? <CheckCheck size={11} style={{ color: 'var(--tl-sev-low)' }} /> : <Copy size={11} />}
              </button>
            </span>
          ) : null
        }
        badge={
          selectedDetection ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <StatusBadge status={selectedDetection.severity} size="sm" />
              <StatusBadge status={selectedDetection.status} dot size="sm" />
            </div>
          ) : null
        }
        width="540px"
      >
        {selectedDetection && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Deterministic Risk Score Card */}
            <div style={{
              background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
              border: '1px solid var(--tl-border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--tl-text-muted)' }}>
                  DETERMINISTIC RISK SCORE
                </span>
                <span className="badge" style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.45rem',
                  fontWeight: 700,
                  color: getScoreColor(selectedDetection.riskScore),
                  border: `1px solid ${getScoreColor(selectedDetection.riskScore)}`
                }}>
                  {selectedDetection.riskCategory} RISK
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  fontFamily: 'var(--tl-font-mono, monospace)',
                  color: getScoreColor(selectedDetection.riskScore),
                  lineHeight: 1
                }}>
                  {selectedDetection.riskScore}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                  / 100 max
                </span>
              </div>

              {/* Progress gauge */}
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--tl-bg-surface, #0E1217)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.max(6, selectedDetection.riskScore))}%`,
                  height: '100%',
                  background: getScoreColor(selectedDetection.riskScore)
                }} />
              </div>

              {/* Score Reasons breakdown */}
              {selectedDetection.scoreReasons && selectedDetection.scoreReasons.length > 0 && (
                <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--tl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Score Formulation Rationale:
                  </div>
                  {selectedDetection.scoreReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.72rem',
                        background: 'var(--tl-bg-surface, var(--surface-panel))',
                        padding: '0.35rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--tl-text-secondary)',
                        fontFamily: 'var(--tl-font-mono, monospace)',
                        borderLeft: '2px solid var(--tl-accent-primary)'
                      }}
                    >
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match Evidence Section */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.4rem'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>
                  Detection Rule Match Evidence
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleCopy(selectedDetection.matchReason, 'match-reason')}
                  style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', height: 'auto' }}
                >
                  {copiedId === 'match-reason' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--tl-sev-low)' }}>
                      <CheckCheck size={11} /> Copied
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Copy size={11} /> Copy
                    </span>
                  )}
                </button>
              </div>

              <div style={{
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                fontSize: '0.76rem',
                color: 'var(--tl-text-primary)',
                fontFamily: 'var(--tl-font-mono, monospace)',
                lineHeight: 1.5,
                wordBreak: 'break-word'
              }}>
                {selectedDetection.matchReason || 'Pattern match criteria satisfied.'}
              </div>

              {selectedDetection.ruleId && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>
                  Rule ID: <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{selectedDetection.ruleId}</span>
                </div>
              )}
            </div>

            {/* Triggering Security Telemetry Event */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Triggering Security Telemetry Event
              </div>

              {logLoading ? (
                <div className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-sm)' }} />
              ) : relatedLog ? (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--tl-border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Event Type</span>
                    <strong style={{ color: 'var(--tl-text-primary)' }}>{relatedLog.eventType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Source IP</span>
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-sev-high)', fontWeight: 600 }}>
                      {relatedLog.sourceIp || '–'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Destination IP</span>
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                      {relatedLog.destinationIp || '–'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Source System</span>
                    <span style={{ color: 'var(--tl-text-primary)' }}>{relatedLog.sourceSystem}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Log Timestamp</span>
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                      {formatIST(relatedLog.timestamp)}
                    </span>
                  </div>

                  {relatedLog.message && (
                    <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--tl-border-subtle)' }}>
                      <span style={{ color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.7rem' }}>
                        Payload Message
                      </span>
                      <div style={{
                        background: 'var(--tl-bg-surface, #0B0D10)',
                        padding: '0.45rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        color: 'var(--tl-text-primary)',
                        fontFamily: 'var(--tl-font-mono, monospace)',
                        border: '1px solid var(--tl-border-subtle)'
                      }}>
                        {relatedLog.message}
                      </div>
                    </div>
                  )}

                  {relatedLog.metadata && Object.keys(relatedLog.metadata).length > 0 && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <span style={{ color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.7rem' }}>
                        Event Metadata
                      </span>
                      <pre style={{
                        margin: 0,
                        background: 'var(--tl-bg-surface, #0B0D10)',
                        padding: '0.45rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        color: 'var(--tl-text-secondary)',
                        fontFamily: 'var(--tl-font-mono, monospace)',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        border: '1px solid var(--tl-border-subtle)'
                      }}>
                        {JSON.stringify(relatedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-muted)' }}>
                  Log reference ID: <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{selectedDetection.logId}</span> (Payload archived or unavailable)
                </div>
              )}
            </div>

            {/* Lifecycle Metadata */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Detection Lifecycle
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
                  <span style={{ color: 'var(--tl-text-muted)' }}>First Evaluated</span>
                  <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                    {formatIST(selectedDetection.detectedAt)}
                  </span>
                </div>
                {selectedDetection.resolvedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Resolved At</span>
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                      {formatIST(selectedDetection.resolvedAt)}
                    </span>
                  </div>
                )}
                {selectedDetection.resolvedBy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Resolved By</span>
                    <span style={{ color: 'var(--tl-text-primary)', fontWeight: 600 }}>
                      {selectedDetection.resolvedBy}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Investigation & Triage Actions */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Investigation &amp; Triage Actions
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {(selectedDetection.status === 'NEW' || selectedDetection.status === 'ALERT_CREATED') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleUpdateStatus(selectedDetection.id, 'ACKNOWLEDGED')}
                    title={!canWrite ? 'Analyst or Admin required' : 'Acknowledge detection'}
                    style={{ justifyContent: 'center' }}
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
                    style={{ justifyContent: 'center' }}
                  >
                    <CheckCircle size={13} style={{ color: 'var(--tl-sev-low)' }} /> Mark Resolved
                  </button>
                )}

                {(selectedDetection.status === 'NEW' || selectedDetection.status === 'ACKNOWLEDGED' || selectedDetection.status === 'ALERT_CREATED') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={actionLoading || !canWrite}
                    onClick={() => handleUpdateStatus(selectedDetection.id, 'FALSE_POSITIVE')}
                    title={!canWrite ? 'Analyst or Admin required' : 'Classify as false positive'}
                    style={{ justifyContent: 'center' }}
                  >
                    <ShieldAlert size={13} style={{ color: 'var(--tl-text-muted)' }} /> Mark as False Positive
                  </button>
                )}

                {selectedDetection.status === 'RESOLVED' && (
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
                    <CheckCircle size={14} style={{ color: 'var(--tl-sev-low)', flexShrink: 0 }} />
                    <span>Detection resolved{selectedDetection.resolvedBy ? ` by ${selectedDetection.resolvedBy}` : ''}. Lifecycle complete.</span>
                  </div>
                )}

                {selectedDetection.status === 'FALSE_POSITIVE' && (
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
                    <ShieldAlert size={14} style={{ color: 'var(--tl-text-muted)', flexShrink: 0 }} />
                    <span>Classified as false positive. Correlation suppressed.</span>
                  </div>
                )}

                {selectedDetection.status === 'ALERT_CREATED' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/alerts?detectionId=${selectedDetection.id}`)}
                    style={{ justifyContent: 'center' }}
                  >
                    <Flame size={13} /> View Alert in Alert Center &rarr;
                  </button>
                )}

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/logs')}
                  style={{ justifyContent: 'center' }}
                >
                  <Terminal size={13} /> Open In Log Explorer &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
