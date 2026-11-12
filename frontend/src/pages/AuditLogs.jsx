import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Sliders,
  UserCheck,
  AlertTriangle,
  FileText,
  Lock,
  Clock,
  Database,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

/**
 * Action category categorization for audit events.
 */
function getActionCategory(action = '') {
  const act = String(action).toUpperCase();
  if (act.startsWith('USER_')) return 'AUTH';
  if (act.startsWith('RULE_')) return 'RULES';
  if (act.startsWith('ALERT_')) return 'ALERTS';
  if (act.startsWith('INCIDENT_') || act.startsWith('RESPONSE_')) return 'INCIDENTS';
  if (act.startsWith('ADMIN_')) return 'ADMIN';
  return 'OTHER';
}

/**
 * Action badge styling mapping.
 */
function getActionVariant(action = '') {
  const act = String(action).toUpperCase();
  if (act.includes('DELETE') || act.includes('DISABLED') || act.includes('CRITICAL')) return 'critical';
  if (act.includes('UPDATE') || act.includes('CHANGE') || act.includes('STATUS')) return 'high';
  if (act.includes('CREATE') || act.includes('ENABLED') || act.includes('REGISTERED')) return 'low';
  if (act.includes('RESOLVE') || act.includes('CLOSE') || act.includes('ACKNOWLEDGE')) return 'low';
  if (act.includes('LOGIN')) return 'accent';
  return 'neutral';
}

/**
 * AuditLogs — Concept A Precision SOC Console
 * SOC Security Governance & Immutable Audit Trail
 */
export default function AuditLogs({
  initialLogs = null,
  initialPage = 0,
  initialPageSize = 30,
  initialTotalPages = null,
  initialTotalElements = null,
  initialSelectedLog = null,
  initialActorFilter = '',
  initialCategoryFilter = 'ALL'
} = {}) {
  const { isAdmin } = useAuth();

  // Audit Logs State
  const [logs, setLogs] = useState(initialLogs || []);
  const [loading, setLoading] = useState(!initialLogs);
  const [error, setError] = useState(null);

  // Pagination State
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? (initialLogs ? 1 : 0));
  const [totalElements, setTotalElements] = useState(
    initialTotalElements ?? (initialLogs ? initialLogs.length : 0)
  );

  // Filter State
  const [actorInput, setActorInput] = useState(initialActorFilter);
  const [actorFilter, setActorFilter] = useState(initialActorFilter);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);

  // Detail Inspection Drawer State
  const [selectedLog, setSelectedLog] = useState(initialSelectedLog);

  const loadAuditLogs = useCallback(async (targetPage = page, targetSize = pageSize, targetActor = actorFilter) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage,
        size: Math.min(targetSize, 200)
      };
      if (targetActor && targetActor.trim()) {
        params.actor = targetActor.trim();
      }
      const res = await api.get('/audit', { params });
      const data = res?.data ?? res;
      setLogs(data?.content ?? []);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      const msg = err?.response?.status === 403
        ? 'Access forbidden: Administrative privilege required to view the audit log.'
        : (err?.message || 'Failed to retrieve governance audit records');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, pageSize, actorFilter]);

  useEffect(() => {
    if (!initialLogs) {
      loadAuditLogs(page, pageSize, actorFilter);
    }
  }, [initialLogs, page, pageSize, actorFilter, loadAuditLogs]);

  const handleRefresh = () => {
    loadAuditLogs(page, pageSize, actorFilter);
  };

  const handleSearchSubmit = () => {
    setActorFilter(actorInput.trim());
    setPage(0);
  };

  const handleClearFilters = () => {
    setActorInput('');
    setActorFilter('');
    setCategoryFilter('ALL');
    setPage(0);
  };

  // Client-side category filtering (since backend only filters by actor on /api/audit)
  const filteredLogs = useMemo(() => {
    if (categoryFilter === 'ALL') return logs;
    return logs.filter(l => getActionCategory(l.action) === categoryFilter);
  }, [logs, categoryFilter]);

  // Derived telemetry metrics
  const stats = useMemo(() => {
    let authEvents = 0;
    let ruleEvents = 0;
    let triageEvents = 0;
    let adminEvents = 0;

    logs.forEach(l => {
      const cat = getActionCategory(l.action);
      if (cat === 'AUTH') authEvents++;
      else if (cat === 'RULES') ruleEvents++;
      else if (cat === 'ALERTS' || cat === 'INCIDENTS') triageEvents++;
      else if (cat === 'ADMIN') adminEvents++;
    });

    return {
      totalRecords: totalElements, // Database-wide total count
      pageTotal: logs.length,
      authEvents,
      ruleEvents,
      triageEvents,
      adminEvents
    };
  }, [logs, totalElements]);

  // Result count formatting distinguishing page loaded records from total backend records
  const resultCountLabel = useMemo(() => {
    if (categoryFilter !== 'ALL') {
      return `${filteredLogs.length} of ${logs.length} on page (${totalElements.toLocaleString()} total in database)`;
    }
    return `${logs.length} on page (${totalElements.toLocaleString()} total in database)`;
  }, [categoryFilter, filteredLogs.length, logs.length, totalElements]);

  // If user is not admin, display dedicated access restriction banner
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="page-header">
          <div className="page-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.08em',
                  color: 'var(--tl-sev-critical)',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                THREATLENS // SECURITY GOVERNANCE
              </span>
              <span className="badge badge-critical" style={{ fontSize: '0.62rem' }}>
                ACCESS RESTRICTED
              </span>
            </div>
            <h1 className="page-title">SOC Audit Governance Trail</h1>
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--tl-bg-surface-elev)',
            borderColor: 'var(--tl-border-default)'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--tl-sev-critical-bg)',
              border: '1px solid var(--tl-sev-critical-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tl-sev-critical)'
            }}
          >
            <Lock size={22} />
          </div>
          <div style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.5rem' }}>
              Administrative Clearance Required
            </h3>
            <p style={{ fontSize: '0.814rem', color: 'var(--tl-text-secondary)', lineHeight: 1.5 }}>
              Access to the SOC Governance and Immutable Audit Trail is strictly restricted to users with the <code>ADMIN</code> role. Analyst and Viewer credentials cannot view mutation logs.
            </p>
          </div>
          <Link to="/command-hub" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
            Return to Command Hub
          </Link>
        </div>
      </div>
    );
  }

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
              THREATLENS // SECURITY GOVERNANCE &amp; AUDIT TRAIL
            </span>
            <span
              className="badge badge-low"
              style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', letterSpacing: '0.04em' }}
              title="Application-level protection: update/delete APIs are not exposed. Not cryptographic or database-enforced immutability."
            >
              AUDIT INTEGRITY: APPLICATION APPEND-ONLY
            </span>
          </div>
          <h1 className="page-title">SOC Audit Governance Trail</h1>
          <p className="page-subtitle">
            Comprehensive audit record of administrative mutations, analyst actions, rule modifications, and authentication lifecycles.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh audit event records"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Immutability & Scope Transparency Disclosure */}
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
          <ShieldCheck size={16} style={{ color: 'var(--tl-accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--tl-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Audit Immutability Scope &amp; Governance Architecture
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 0.35rem 0' }}>
            <strong style={{ color: 'var(--tl-text-primary)' }}>Application-Level Protection:</strong> Update and delete operations are not exposed through the application API. This is application-level access protection enforced by Spring Security and backend service controls; it is <em>not cryptographic or database-enforced immutability</em> (the underlying MongoDB <code>audit_logs</code> collection does not enforce storage-engine append-only constraints).
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--tl-text-primary)' }}>SOC Application Audit vs. Endpoint Security Telemetry:</strong> This workspace records <em>internal administrative actions and analyst mutations</em> (user logins, rule changes, alert triage, incident lifecycle updates, and response recordings) within ThreatLens. For ingested Linux system journal, auditd, and collector logs, navigate to the{' '}
            <Link to="/logs" style={{ color: 'var(--tl-accent-primary)', textDecoration: 'underline' }}>
              Security Log Explorer
            </Link>.
          </p>
        </div>
      </div>

      {/* Telemetry KPI Strip */}
      <div className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        <KPICard
          label="Total Audited Events"
          value={stats.totalRecords.toLocaleString()}
          sub="Database-wide audit records"
          icon={Database}
          variant="default"
          loading={loading && logs.length === 0}
        />
        <KPICard
          label="Page Triage Actions"
          value={stats.triageEvents}
          sub={`Alert & incident actions on page (${stats.triageEvents}/${stats.pageTotal})`}
          icon={AlertTriangle}
          variant="accent"
          loading={loading && logs.length === 0}
        />
        <KPICard
          label="Page Rule Mutations"
          value={stats.ruleEvents}
          sub={`Rule creations/edits on page (${stats.ruleEvents}/${stats.pageTotal})`}
          icon={Sliders}
          variant="healthy"
          loading={loading && logs.length === 0}
        />
        <KPICard
          label="Page Auth Events"
          value={stats.authEvents}
          sub={`Authentication events on page (${stats.authEvents}/${stats.pageTotal})`}
          icon={UserCheck}
          variant="default"
          loading={loading && logs.length === 0}
        />
      </div>

      {/* Governance Filter Bar */}
      <FilterBar
        searchQuery={actorInput}
        onSearchChange={setActorInput}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search actor username (database-wide query)…"
        showApplyButton
        hasActiveFilters={Boolean(actorFilter || categoryFilter !== 'ALL')}
        onClear={handleClearFilters}
        resultCount={resultCountLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>Category (Page-Scoped Filter):</span>
          <select
            className="form-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="AUTH">Authentication (USER_*)</option>
            <option value="RULES">Detection Rules (RULE_*)</option>
            <option value="ALERTS">Alert Triage (ALERT_*)</option>
            <option value="INCIDENTS">Incidents &amp; Response (INCIDENT_*)</option>
            <option value="ADMIN">Administrative (ADMIN_*)</option>
          </select>
        </div>
      </FilterBar>

      {/* Audit Event Data Table */}
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="panel-title">Audit Governance Trail</span>
          <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {loading && logs.length === 0
              ? 'Loading…'
              : categoryFilter !== 'ALL'
                ? `Showing ${filteredLogs.length} of ${logs.length} records on current page (${totalElements.toLocaleString()} total in database)`
                : `Showing ${logs.length} records on current page (${totalElements.toLocaleString()} total in database)`}
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '165px' }}>Timestamp (IST)</th>
                <th style={{ width: '120px' }}>Actor</th>
                <th style={{ width: '190px' }}>Action</th>
                <th style={{ width: '170px' }}>Target Resource</th>
                <th>Details Payload Summary</th>
                <th style={{ width: '70px', textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '0.75rem 1rem' }}>
                      <div className="skeleton" style={{ height: '20px', borderRadius: 'var(--radius-sm)' }} />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--tl-sev-critical)', fontSize: '0.814rem' }}>
                      <AlertTriangle size={15} />
                      <span>{error}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => loadAuditLogs(page, pageSize, actorFilter)}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '2.5rem' }}>
                      <div className="empty-state-title">No audit records found</div>
                      <div className="empty-state-text">
                        {actorFilter || categoryFilter !== 'ALL'
                          ? 'No audit events matched your search criteria. Clear filters to view full trail.'
                          : 'Administrative and analyst mutations will be recorded here.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const category = getActionCategory(log.action);
                  const variant = getActionVariant(log.action);
                  const detailsPreview = log.details ? JSON.stringify(log.details) : '—';

                  return (
                    <tr
                      key={log.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="col-mono col-dim" style={{ fontSize: '0.75rem' }}>
                        {formatIST(log.timestamp)}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--tl-text-primary)', fontSize: '0.814rem' }}>
                        {log.actor || 'SYSTEM'}
                      </td>
                      <td>
                        <StatusBadge
                          status={log.action}
                          variant={variant}
                          size="xs"
                          label={log.action}
                        />
                      </td>
                      <td style={{ color: 'var(--tl-text-secondary)', fontSize: '0.786rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                          {log.resourceType || '—'}
                        </span>
                        {log.resourceId && (
                          <span
                            className="col-mono col-dim"
                            style={{ marginLeft: '0.35rem', fontSize: '0.714rem' }}
                            title={log.resourceId}
                          >
                            #{log.resourceId.length > 8 ? log.resourceId.substring(0, 8) + '…' : log.resourceId}
                          </span>
                        )}
                      </td>
                      <td
                        className="col-mono col-dim"
                        style={{
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.73rem'
                        }}
                        title={detailsPreview}
                      >
                        {detailsPreview}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
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
          loading={loading}
          itemLabel="audit records"
        />
      </div>

      {/* Audit Event Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.action || 'Audit Event Record'}
        subtitle={`Event ID: ${selectedLog?.id || '—'} // Resource: ${selectedLog?.resourceType || '—'}`}
        badge={
          selectedLog ? (
            <StatusBadge
              status={selectedLog.action}
              variant={getActionVariant(selectedLog.action)}
              size="xs"
            />
          ) : null
        }
        width="540px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.814rem' }}>
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
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Event ID</span>
                <span className="col-mono" style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)' }}>
                  {selectedLog.id}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Recorded Timestamp (IST)</span>
                <span className="col-mono" style={{ fontSize: '0.75rem', color: 'var(--tl-text-primary)' }}>
                  {formatIST(selectedLog.timestamp)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Actor Identity</span>
                <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                  {selectedLog.actor || 'SYSTEM'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block' }}>Governance Category</span>
                <span className="badge badge-accent" style={{ fontSize: '0.62rem' }}>
                  {getActionCategory(selectedLog.action)}
                </span>
              </div>
            </div>

            {/* Target Resource */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Target Resource Context
              </span>
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                    {selectedLog.resourceType}
                  </span>
                  {selectedLog.resourceId && (
                    <span className="col-mono" style={{ marginLeft: '0.5rem', color: 'var(--tl-text-secondary)', fontSize: '0.75rem' }}>
                      ID: {selectedLog.resourceId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Structured Details Breakdown */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Mutation Details Breakdown
              </span>
              {selectedLog.details && typeof selectedLog.details === 'object' && Object.keys(selectedLog.details).length > 0 ? (
                <div
                  style={{
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <tbody>
                      {Object.entries(selectedLog.details).map(([key, val], idx) => (
                        <tr
                          key={key}
                          style={{
                            borderBottom: idx === Object.keys(selectedLog.details).length - 1 ? 'none' : '1px solid var(--tl-border-subtle)'
                          }}
                        >
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--tl-text-muted)', width: '40%', fontWeight: 500 }}>
                            {key}
                          </td>
                          <td className="col-mono" style={{ padding: '0.45rem 0.75rem', color: 'var(--tl-text-primary)' }}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.65rem 0.75rem',
                    background: 'var(--tl-bg-surface)',
                    border: '1px solid var(--tl-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--tl-text-muted)',
                    fontSize: '0.75rem'
                  }}
                >
                  No detailed property mutations recorded for this event.
                </div>
              )}
            </div>

            {/* Raw JSON Payload */}
            <div>
              <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Raw Audit Document
              </span>
              <pre
                className="col-mono"
                style={{
                  padding: '0.75rem',
                  background: 'var(--tl-bg-canvas)',
                  border: '1px solid var(--tl-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.714rem',
                  color: 'var(--tl-text-secondary)',
                  overflowX: 'auto',
                  margin: 0
                }}
              >
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
