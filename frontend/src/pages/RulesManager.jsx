import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  Sliders,
  Check,
  Radar,
  ArrowRight,
  Terminal,
  Activity,
  Copy,
  CheckCheck,
  Edit2,
  Trash2,
  Clock,
  User,
  X
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

const VALID_EVENT_TYPES = [
  'AUTHENTICATION_FAILURE',
  'AUTHENTICATION_SUCCESS',
  'AUTHORIZATION_FAILURE',
  'PORT_SCAN',
  'BRUTE_FORCE',
  'SQL_INJECTION',
  'XSS_ATTEMPT',
  'MALWARE_DETECTED',
  'RANSOMWARE_DETECTED',
  'SUSPICIOUS_PROCESS',
  'NETWORK_ANOMALY',
  'FILE_INTEGRITY_VIOLATION',
  'PRIVILEGE_ESCALATION',
  'DATA_EXFILTRATION',
  'POLICY_VIOLATION',
  'SYSTEM_ERROR',
  'OTHER'
];

const RULE_TYPES = [
  { value: 'THRESHOLD', label: 'Threshold (Sliding Window)', desc: 'Triggers when N matching events occur within a time window.' },
  { value: 'PATTERN_MATCH', label: 'Pattern Match (Message Regex)', desc: 'Searches log message payload for keyword or regex patterns.' },
  { value: 'IP_MATCH', label: 'Source IP Watchlist', desc: 'Triggers when events originate from monitored IP addresses.' },
  { value: 'EVENT_TYPE_MATCH', label: 'Event Type Match', desc: 'Triggers immediately upon receiving specific log event types.' },
  { value: 'COMPOSITE', label: 'Composite (Pattern + Threshold)', desc: 'Combines log message regex patterns with sliding window frequency.' }
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const TIME_PRESETS = [
  { label: '1 min (60s)', seconds: 60 },
  { label: '5 min (300s)', seconds: 300 },
  { label: '10 min (600s)', seconds: 600 },
  { label: '30 min (1800s)', seconds: 1800 },
  { label: '1 hour (3600s)', seconds: 3600 }
];

function isValidIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const ipv4 = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4.test(ip.trim()) || ipv6.test(ip.trim());
}

const DEFAULT_FORM_STATE = {
  name: '',
  description: '',
  type: 'THRESHOLD',
  severity: 'HIGH',
  enabled: true,
  condition: {
    thresholdCount: 5,
    thresholdWindowSeconds: 300,
    groupBySourceIp: true,
    patterns: [],
    ipAddresses: [],
    eventTypes: ['AUTHENTICATION_FAILURE'],
    severities: []
  }
};

export default function RulesManager({
  initialRules = null,
  initialKpiStats = null,
  initialSelectedRule = null
} = {}) {
  const { user, canWrite } = useAuth();

  // Rules Data & Pagination
  const [rules, setRules] = useState(initialRules || []);
  const [loading, setLoading] = useState(initialRules === null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(initialRules ? initialRules.length : 0);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Rule for Inspection
  const [selectedRule, setSelectedRule] = useState(initialSelectedRule || null);

  // Form & Modals
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [editingOriginalCondition, setEditingOriginalCondition] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modal input helpers
  const [newIpInput, setNewIpInput] = useState('');
  const [newPatternInput, setNewPatternInput] = useState('');
  const [ipInputError, setIpInputError] = useState('');

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  // KPI Overview Metrics
  const [kpiStats, setKpiStats] = useState(initialKpiStats || {
    totalRules: initialRules ? initialRules.length : 0,
    enabledRules: 0,
    disabledRules: 0
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

  // Load KPI overview metrics from backend
  const loadKpis = useCallback(async () => {
    try {
      const res = await api.get('/rules/stats');
      const d = res?.data ?? res;
      if (d) {
        setKpiStats({
          totalRules: d.totalRules || 0,
          enabledRules: d.enabledRules || 0,
          disabledRules: d.disabledRules || 0
        });
      }
    } catch {
      // Fallback: derive from dashboard stats if available
      try {
        const dRes = await api.get('/dashboard/stats');
        const d = dRes?.data ?? dRes;
        if (d && d.activeRules !== undefined) {
          setKpiStats(prev => ({
            ...prev,
            enabledRules: d.activeRules
          }));
        }
      } catch {
        // Silent fallback
      }
    }
  }, []);

  // Fetch paginated detection rules
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize
      };
      if (statusFilter !== '') params.enabled = statusFilter === 'true';
      if (typeFilter) params.type = typeFilter;

      const res = await api.get('/rules', { params });
      const d = res?.data ?? res;
      const items = d?.content ?? (Array.isArray(d) ? d : []);
      setRules(items);
      setTotalPages(d?.totalPages || 1);
      setTotalElements(d?.totalElements ?? items.length);

      // Refresh selected rule in-memory if open
      if (selectedRule) {
        const updated = items.find(r => r.id === selectedRule.id);
        if (updated) setSelectedRule(updated);
      }
    } catch (err) {
      toast('error', err.message || 'Failed to load detection rules');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, selectedRule?.id]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    loadRules();
  }, [page, pageSize, statusFilter, typeFilter]);

  // Enable/Disable toggle action
  const handleToggle = async (rule, e) => {
    if (e) e.stopPropagation();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to toggle rules');
      return;
    }
    setActionLoading(true);
    try {
      const endpoint = rule.enabled ? `/rules/${rule.id}/disable` : `/rules/${rule.id}/enable`;
      const res = await api.put(endpoint);
      const updated = res?.data ?? res;
      toast('success', `Rule "${rule.name}" ${rule.enabled ? 'disabled' : 'enabled'}`);
      loadRules();
      loadKpis();
      if (selectedRule?.id === rule.id) {
        setSelectedRule(updated || { ...rule, enabled: !rule.enabled });
      }
    } catch (err) {
      toast('error', err.message || 'Failed to update rule status');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setEditTargetId(null);
    setEditingOriginalCondition(null);
    setFormData(DEFAULT_FORM_STATE);
    setNewIpInput('');
    setNewPatternInput('');
    setIpInputError('');
    setShowModal(true);
  };

  // Open Edit Modal with existing rule values
  const openEditModal = (rule, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditTargetId(rule.id);
    setEditingOriginalCondition(rule.condition ? { ...rule.condition } : null);
    setFormData({
      name: rule.name || '',
      description: rule.description || '',
      type: rule.type || 'THRESHOLD',
      severity: rule.severity || 'HIGH',
      enabled: rule.enabled ?? true,
      condition: {
        thresholdCount: rule.condition?.thresholdCount ?? 5,
        thresholdWindowSeconds: rule.condition?.thresholdWindowSeconds ?? 300,
        groupBySourceIp: rule.condition?.groupBySourceIp ?? true,
        patterns: Array.isArray(rule.condition?.patterns) ? [...rule.condition.patterns] : [],
        ipAddresses: Array.isArray(rule.condition?.ipAddresses) ? [...rule.condition.ipAddresses] : [],
        eventTypes: Array.isArray(rule.condition?.eventTypes) && rule.condition.eventTypes.length > 0
          ? [...rule.condition.eventTypes]
          : ['AUTHENTICATION_FAILURE'],
        severities: Array.isArray(rule.condition?.severities) ? [...rule.condition.severities] : []
      }
    });
    setNewIpInput('');
    setNewPatternInput('');
    setIpInputError('');
    setShowModal(true);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (rule, e) => {
    if (e) e.stopPropagation();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required to delete rules');
      return;
    }
    setRuleToDelete(rule);
    setShowDeleteModal(true);
  };

  // Confirm Rule Deletion
  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/rules/${ruleToDelete.id}`);
      toast('success', `Rule "${ruleToDelete.name}" deleted successfully`);
      setShowDeleteModal(false);
      setRuleToDelete(null);
      if (selectedRule?.id === ruleToDelete.id) setSelectedRule(null);
      loadRules();
      loadKpis();
    } catch (err) {
      toast('error', err.message || 'Failed to delete rule');
    } finally {
      setActionLoading(false);
    }
  };

  // IP Allowlist handlers
  const handleAddIp = () => {
    const val = newIpInput.trim();
    if (!val) return;
    if (!isValidIp(val)) {
      setIpInputError('Invalid IPv4 or IPv6 address format.');
      return;
    }
    if (formData.condition.ipAddresses.includes(val)) {
      setIpInputError('IP is already in the list.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      condition: {
        ...prev.condition,
        ipAddresses: [...prev.condition.ipAddresses, val]
      }
    }));
    setNewIpInput('');
    setIpInputError('');
  };

  const handleRemoveIp = (ipToRemove) => {
    setFormData(prev => ({
      ...prev,
      condition: {
        ...prev.condition,
        ipAddresses: prev.condition.ipAddresses.filter(ip => ip !== ipToRemove)
      }
    }));
  };

  // Pattern handlers
  const handleAddPattern = () => {
    const val = newPatternInput.trim();
    if (!val) return;
    if (formData.condition.patterns.includes(val)) return;
    setFormData(prev => ({
      ...prev,
      condition: {
        ...prev.condition,
        patterns: [...prev.condition.patterns, val]
      }
    }));
    setNewPatternInput('');
  };

  const handleRemovePattern = (patToRemove) => {
    setFormData(prev => ({
      ...prev,
      condition: {
        ...prev.condition,
        patterns: prev.condition.patterns.filter(p => p !== patToRemove)
      }
    }));
  };

  // Toggle Event Type selection
  const handleToggleEventType = (evType) => {
    setFormData(prev => {
      const cur = prev.condition.eventTypes || [];
      const updated = cur.includes(evType)
        ? cur.filter(t => t !== evType)
        : [...cur, evType];
      return {
        ...prev,
        condition: {
          ...prev.condition,
          eventTypes: updated
        }
      };
    });
  };

  // Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canWrite) {
      toast('error', 'Analyst or Admin role required');
      return;
    }

    // Client-side validation per RuleType
    const cond = formData.condition;
    if (!formData.name.trim()) {
      toast('error', 'Rule name is required');
      return;
    }

    if (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') {
      if (!cond.thresholdCount || cond.thresholdCount < 1) {
        toast('error', 'Threshold count must be at least 1');
        return;
      }
      if (!cond.thresholdWindowSeconds || cond.thresholdWindowSeconds < 1) {
        toast('error', 'Threshold window must be at least 1 second');
        return;
      }
    } else if (formData.type === 'PATTERN_MATCH') {
      if (!cond.patterns || cond.patterns.length === 0) {
        toast('error', 'Pattern Match rules require at least one pattern keyword or regex');
        return;
      }
    } else if (formData.type === 'IP_MATCH') {
      if (!cond.ipAddresses || cond.ipAddresses.length === 0) {
        toast('error', 'IP Match rules require at least one IP address in the watchlist');
        return;
      }
    } else if (formData.type === 'EVENT_TYPE_MATCH') {
      if (!cond.eventTypes || cond.eventTypes.length === 0) {
        toast('error', 'Event Type Match rules require at least one target event type');
        return;
      }
    }

    setActionLoading(true);
    try {
      const baseCondition = isEditing && editingOriginalCondition ? { ...editingOriginalCondition } : {};
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        severity: formData.severity,
        enabled: formData.enabled,
        condition: {
          ...baseCondition,
          thresholdCount: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Number(cond.thresholdCount) : undefined,
          thresholdWindowSeconds: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Number(cond.thresholdWindowSeconds) : undefined,
          groupBySourceIp: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Boolean(cond.groupBySourceIp) : undefined,
          patterns: (formData.type === 'PATTERN_MATCH' || formData.type === 'COMPOSITE') ? cond.patterns : undefined,
          ipAddresses: cond.ipAddresses && cond.ipAddresses.length > 0 ? cond.ipAddresses : undefined,
          eventTypes: cond.eventTypes && cond.eventTypes.length > 0 ? cond.eventTypes : undefined,
          severities: cond.severities && cond.severities.length > 0 ? cond.severities : (baseCondition.severities || undefined)
        }
      };

      if (isEditing && editTargetId) {
        const res = await api.put(`/rules/${editTargetId}`, payload);
        const updated = res?.data ?? res;
        toast('success', `Rule "${updated.name}" updated successfully`);
        if (selectedRule?.id === editTargetId) setSelectedRule(updated);
      } else {
        const res = await api.post('/rules', payload);
        const created = res?.data ?? res;
        toast('success', `Detection rule "${created.name}" created and deployed`);
        if (created?.id) setSelectedRule(created);
      }

      setShowModal(false);
      loadRules();
      loadKpis();
    } catch (err) {
      toast('error', err.message || 'Failed to save detection rule');
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side quick filter on current loaded batch
  const filteredRules = rules.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.type && r.type.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.condition?.ipAddresses && r.condition.ipAddresses.some(ip => ip.toLowerCase().includes(q))) ||
      (r.condition?.eventTypes && r.condition.eventTypes.some(t => t.toLowerCase().includes(q)))
    );
  });

  const clearAllFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchQuery('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(statusFilter || typeFilter || searchQuery);

  return (
    <div className="soc-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Precision SOC Page Header */}
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
              THREATLENS // DETECTION ENGINE
            </span>
            <span className="bullet-sep" style={{ color: 'var(--tl-border-default)' }}>&bull;</span>
            <span className="badge badge-neutral" style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--tl-font-mono, monospace)',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}>
              ARMED RULES: {kpiStats.enabledRules}
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
            Detection Rules
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--tl-text-secondary)' }}>
            Configure correlation logic, threshold sliding windows, IP watchlists, and pattern detection rules evaluated against ingested security logs.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={openCreateModal}
            disabled={!canWrite}
            title={!canWrite ? 'Analyst or Admin required' : 'Create new detection rule'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <Plus size={13} />
            <span>New Rule</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadRules(); loadKpis(); }}
            disabled={loading}
            title="Refresh rules from backend"
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
          <span><strong>Viewer Mode:</strong> You have read-only clearance. Creating rules, updating threshold criteria, and enabling or disabling rules require Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        <KPICard
          label="Total Rules"
          value={kpiStats.totalRules || totalElements}
          sub="Registered detection policies"
          icon={Sliders}
          variant="default"
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Active & Armed"
          value={kpiStats.enabledRules}
          sub="Evaluating ingested telemetry"
          icon={Activity}
          variant={kpiStats.enabledRules > 0 ? 'healthy' : 'neutral'}
          loading={loading && totalElements === 0}
        />
        <KPICard
          label="Disabled / Standby"
          value={kpiStats.disabledRules}
          sub="Suspended or staging rules"
          icon={Shield}
          variant={kpiStats.disabledRules > 0 ? 'warning' : 'neutral'}
          loading={loading && totalElements === 0}
        />
      </div>

      {/* Precision Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={val => { setSearchQuery(val); setPage(0); }}
        searchPlaceholder="Filter loaded rules by name, description, type, IP, or event type…"
        searchMaxWidth={360}
        onClear={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        resultCount={
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--tl-font-mono, monospace)',
            color: 'var(--tl-text-muted)'
          }}>
            Showing {filteredRules.length} of {rules.length} on current page • {totalElements} total in database
          </span>
        }
      >
        <select
          className="form-select form-select-sm"
          style={{ width: '145px', fontSize: '0.75rem' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Statuses</option>
          <option value="true">Armed Only</option>
          <option value="false">Disabled Only</option>
        </select>

        <select
          className="form-select form-select-sm"
          style={{ width: '165px', fontSize: '0.75rem' }}
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Rule Types</option>
          {RULE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.value}</option>
          ))}
        </select>
      </FilterBar>

      {/* Rule Inventory Table Panel */}
      <div className="panel" style={{
        background: 'var(--tl-bg-surface)',
        border: '1px solid var(--tl-border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ overflowX: 'auto', minHeight: '340px' }}>
          {loading && rules.length === 0 ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '42px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : filteredRules.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--tl-text-muted)' }}>
              <Radar size={32} style={{ margin: '0 auto 0.6rem', opacity: 0.35 }} />
              {searchQuery.trim() && rules.length > 0 ? (
                <>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--tl-text-secondary)', marginBottom: '0.25rem' }}>
                    No Matching Detection Rules
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--tl-text-muted)' }}>
                    No rules on current page match &ldquo;{searchQuery}&rdquo;. Clear filter or switch pages.
                  </div>
                </>
              ) : statusFilter || typeFilter ? (
                <>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--tl-text-secondary)', marginBottom: '0.25rem' }}>
                    No Rules Match Selected Filters
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--tl-text-muted)' }}>
                    No rules found matching status: {statusFilter === 'true' ? 'Armed' : statusFilter === 'false' ? 'Disabled' : 'All'} and type: {typeFilter || 'All'}.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--tl-text-secondary)', marginBottom: '0.25rem' }}>
                    No Detection Rules Configured
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--tl-text-muted)', marginBottom: '0.85rem' }}>
                    Deploy your first detection policy to evaluate ingested security logs.
                  </div>
                  {canWrite && (
                    <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                      <Plus size={13} /> Create First Rule
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--tl-border-subtle)',
                  background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))'
                }}>
                  <th style={{ width: '95px', padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ width: '95px', padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>Severity</th>
                  <th style={{ padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>Rule Name &amp; ID</th>
                  <th style={{ width: '140px', padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>Condition Summary</th>
                  <th style={{ width: '120px', padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--tl-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map(rule => {
                  const isSelected = selectedRule?.id === rule.id;
                  const sev = (rule.severity || 'HIGH').toUpperCase();
                  return (
                    <tr
                      key={rule.id}
                      onClick={() => setSelectedRule(rule)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tl-border-subtle)',
                        background: isSelected ? 'var(--tl-bg-surface-elevated, var(--surface-elevated))' : undefined,
                        opacity: rule.enabled ? 1 : 0.65,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={rule.enabled ? 'ARMED' : 'STANDBY'} dot size="xs" />
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <StatusBadge status={sev} size="xs" />
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)', fontSize: '0.82rem' }}>
                            {rule.name}
                          </span>
                          {rule.id && (
                            <span style={{
                              fontFamily: 'var(--tl-font-mono, monospace)',
                              fontSize: '0.64rem',
                              color: 'var(--tl-text-muted)',
                              background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                              padding: '0.1rem 0.35rem',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--tl-border-subtle)'
                            }}>
                              {rule.id.slice(-8)}
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <div style={{
                            fontSize: '0.72rem',
                            color: 'var(--tl-text-secondary)',
                            maxWidth: '380px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {rule.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.7rem',
                          color: 'var(--tl-text-secondary)',
                          background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--tl-border-subtle)'
                        }}>
                          {rule.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: 'var(--tl-text-secondary)' }}>
                        {rule.type === 'THRESHOLD' && (
                          <span>
                            &ge;{rule.condition?.thresholdCount} in {rule.condition?.thresholdWindowSeconds}s
                            {rule.condition?.groupBySourceIp && ' (per IP)'}
                            {rule.condition?.eventTypes?.length > 0 && ` • [${rule.condition.eventTypes.join(', ')}]`}
                          </span>
                        )}
                        {rule.type === 'PATTERN_MATCH' && (
                          <span>
                            Patterns: {rule.condition?.patterns?.map(p => `'${p}'`).join(', ') || '–'}
                          </span>
                        )}
                        {rule.type === 'IP_MATCH' && (
                          <span>
                            IP Watchlist: {rule.condition?.ipAddresses?.join(', ') || '–'}
                          </span>
                        )}
                        {rule.type === 'EVENT_TYPE_MATCH' && (
                          <span>
                            Types: {rule.condition?.eventTypes?.join(', ') || '–'}
                          </span>
                        )}
                        {rule.type === 'COMPOSITE' && (
                          <span>
                            Pattern &amp; Threshold (&ge;{rule.condition?.thresholdCount || 1} in {rule.condition?.thresholdWindowSeconds || 60}s)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                          <button
                            className={`btn btn-sm ${rule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                            disabled={actionLoading || !canWrite}
                            title={!canWrite ? 'Analyst or Admin required' : rule.enabled ? 'Disable rule' : 'Enable rule'}
                            onClick={(e) => handleToggle(rule, e)}
                            style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                          >
                            {rule.enabled ? <XCircle size={11} /> : <CheckCircle size={11} />}
                            <span>{rule.enabled ? 'Disable' : 'Enable'}</span>
                          </button>
                          {canWrite && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Edit rule"
                              onClick={(e) => openEditModal(rule, e)}
                              style={{ padding: '0.25rem' }}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Delete rule"
                              onClick={(e) => openDeleteModal(rule, e)}
                              style={{ padding: '0.25rem', color: 'var(--tl-sev-critical)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Pagination Bar */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(0); }}
          itemLabel="rules"
          loading={loading}
          style={{ borderTop: '1px solid var(--tl-border-subtle)', background: 'var(--tl-bg-surface)' }}
        />
      </div>

      {/* Detail Drawer for Inspecting Selected Rule */}
      <DetailDrawer
        isOpen={Boolean(selectedRule)}
        onClose={() => setSelectedRule(null)}
        title={selectedRule?.name || 'Detection Rule Inspection'}
        subtitle={
          selectedRule ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-muted)' }}>
                Rule ID: {selectedRule.id}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                title="Copy Rule ID"
                onClick={() => handleCopy(selectedRule.id, 'rule-id')}
                style={{ padding: '0.15rem' }}
              >
                {copiedId === 'rule-id' ? <CheckCheck size={11} style={{ color: 'var(--tl-sev-low)' }} /> : <Copy size={11} />}
              </button>
            </span>
          ) : null
        }
        badge={
          selectedRule ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <StatusBadge status={selectedRule.severity} size="sm" />
              <StatusBadge status={selectedRule.enabled ? 'ARMED' : 'STANDBY'} dot size="sm" />
            </div>
          ) : null
        }
        width="520px"
      >
        {selectedRule && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${selectedRule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                disabled={actionLoading || !canWrite}
                onClick={() => handleToggle(selectedRule)}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {selectedRule.enabled ? <XCircle size={13} /> : <CheckCircle size={13} />}
                <span>{selectedRule.enabled ? 'Disable Rule' : 'Enable Rule'}</span>
              </button>
              {canWrite && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEditModal(selectedRule)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
              {canWrite && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => openDeleteModal(selectedRule)}
                  style={{ color: 'var(--tl-sev-critical)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Delete rule"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>

            {/* Rule Description */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Rule Description &amp; Purpose
              </div>
              <div style={{
                fontSize: '0.76rem',
                color: 'var(--tl-text-secondary)',
                lineHeight: 1.5,
                padding: '0.65rem 0.75rem',
                background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
                border: '1px solid var(--tl-border-default)',
                borderRadius: 'var(--radius-sm)'
              }}>
                {selectedRule.description || 'No description provided for this detection rule.'}
              </div>
            </div>

            {/* Condition Configuration */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Condition Configuration ({selectedRule.type})
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
                {/* Threshold settings */}
                {(selectedRule.type === 'THRESHOLD' || selectedRule.type === 'COMPOSITE') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Threshold Count:</span>
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                        &ge; {selectedRule.condition?.thresholdCount ?? 1} events
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Sliding Window:</span>
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>
                        {selectedRule.condition?.thresholdWindowSeconds ?? 60} seconds ({((selectedRule.condition?.thresholdWindowSeconds ?? 60) / 60).toFixed(1)}m)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--tl-text-muted)' }}>Source IP Grouping:</span>
                      <span>
                        {selectedRule.condition?.groupBySourceIp ? (
                          <span style={{ color: 'var(--tl-sev-low)', fontWeight: 600 }}>
                            Enabled (Per-IP Counter)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--tl-text-muted)' }}>
                            Disabled (Global Aggregate)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Target Event Types */}
                {selectedRule.condition?.eventTypes && selectedRule.condition.eventTypes.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--tl-border-subtle)', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', marginBottom: '0.35rem' }}>
                      Target Event Types ({selectedRule.condition.eventTypes.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {selectedRule.condition.eventTypes.map(t => (
                        <span key={t} className="badge badge-low" style={{ fontSize: '0.68rem', fontFamily: 'var(--tl-font-mono, monospace)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Patterns */}
                {selectedRule.condition?.patterns && selectedRule.condition.patterns.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--tl-border-subtle)', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', marginBottom: '0.35rem' }}>
                      Match Patterns / Regex ({selectedRule.condition.patterns.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {selectedRule.condition.patterns.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontFamily: 'var(--tl-font-mono, monospace)',
                            fontSize: '0.72rem',
                            padding: '0.35rem 0.55rem',
                            background: 'var(--tl-bg-surface)',
                            border: '1px solid var(--tl-border-default)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--tl-sev-high)'
                          }}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IP Watchlist */}
                {selectedRule.condition?.ipAddresses && selectedRule.condition.ipAddresses.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--tl-border-subtle)', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', marginBottom: '0.35rem' }}>
                      Source IP Watchlist / Allowlist ({selectedRule.condition.ipAddresses.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {selectedRule.condition.ipAddresses.map(ip => (
                        <span key={ip} style={{
                          fontFamily: 'var(--tl-font-mono, monospace)',
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          background: 'var(--tl-bg-surface)',
                          border: '1px solid var(--tl-border-default)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--tl-text-secondary)'
                        }}>
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SOC Evaluation Notice */}
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--tl-text-muted)',
              lineHeight: 1.4,
              padding: '0.45rem 0.65rem',
              background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
              border: '1px solid var(--tl-border-subtle)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <strong style={{ color: 'var(--tl-text-secondary)' }}>RuleMatcher SOC Protocol:</strong> Detection rules evaluated against ingested security logs. Match triggers generate threat detections with forensic audit trails.
            </div>

            {/* Metadata Grid */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--tl-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Rule Metadata &amp; Audit
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
                  <span style={{ color: 'var(--tl-text-muted)' }}>Created By:</span>
                  <span style={{ fontWeight: 500, color: 'var(--tl-text-primary)' }}>{selectedRule.createdBy || 'system'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tl-text-muted)' }}>Created At (IST):</span>
                  <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selectedRule.createdAt)}</span>
                </div>
                {selectedRule.updatedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Last Updated (IST):</span>
                    <span style={{ fontFamily: 'var(--tl-font-mono, monospace)', color: 'var(--tl-text-secondary)' }}>{formatIST(selectedRule.updatedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Advanced Rule Builder Modal (Create & Edit) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? `Edit Rule: ${formData.name || 'Unnamed'}` : 'New Detection Rule'}
        icon={<Sliders size={16} />}
        confirmText={isEditing ? 'Save Changes' : 'Deploy Rule'}
        confirmLoading={actionLoading}
        confirmDisabled={!canWrite || !formData.name.trim()}
        onConfirm={handleSubmit}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Basic info */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Rule Name *
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. SSH Brute Force Detection"
              required
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
              Description
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              placeholder="Explain the threat behavior, attacker tactics, or detection purpose…"
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Rule Type *
              </label>
              <select
                className="form-select"
                value={formData.type}
                onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', fontSize: '0.78rem' }}
              >
                {RULE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                Trigger Severity *
              </label>
              <select
                className="form-select"
                value={formData.severity}
                onChange={e => setFormData(f => ({ ...f, severity: e.target.value }))}
                style={{ width: '100%', fontSize: '0.78rem' }}
              >
                {SEVERITIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.78rem' }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData(f => ({ ...f, enabled: e.target.checked }))}
              />
              <span style={{ color: 'var(--tl-text-primary)' }}>Arm rule immediately upon deployment (Enabled)</span>
            </label>
          </div>

          {/* Dynamic Configuration based on Type */}
          <div style={{
            padding: '0.85rem',
            background: 'var(--tl-bg-surface-elevated, var(--surface-elevated))',
            border: '1px solid var(--tl-border-default)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
              {RULE_TYPES.find(t => t.value === formData.type)?.label} Configuration
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>
              {RULE_TYPES.find(t => t.value === formData.type)?.desc}
            </div>

            {/* THRESHOLD Configuration */}
            {(formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.2rem', display: 'block' }}>
                      Threshold Count * (events)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={formData.condition.thresholdCount}
                      onChange={e => setFormData(f => ({
                        ...f,
                        condition: { ...f.condition, thresholdCount: Math.max(1, parseInt(e.target.value) || 1) }
                      }))}
                      required
                      style={{ width: '100%', fontSize: '0.78rem' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginTop: '0.2rem' }}>
                      Minimum event count to trigger an alert.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.2rem', display: 'block' }}>
                      Time Window * (seconds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={formData.condition.thresholdWindowSeconds}
                      onChange={e => setFormData(f => ({
                        ...f,
                        condition: { ...f.condition, thresholdWindowSeconds: Math.max(1, parseInt(e.target.value) || 60) }
                      }))}
                      required
                      style={{ width: '100%', fontSize: '0.78rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      {TIME_PRESETS.map(p => (
                        <button
                          key={p.seconds}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setFormData(f => ({
                            ...f,
                            condition: { ...f.condition, thresholdWindowSeconds: p.seconds }
                          }))}
                          style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Group by Source IP */}
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-default)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.condition.groupBySourceIp)}
                      onChange={e => setFormData(f => ({
                        ...f,
                        condition: { ...f.condition, groupBySourceIp: e.target.checked }
                      }))}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                        Group by Source IP (Independent Counter)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', marginTop: '0.1rem' }}>
                        When enabled, the threshold is tracked separately per unique source IP address (e.g. 5 failed logins from the same attacking host). When disabled, events from all hosts are pooled globally.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Target Event Types */}
            {(formData.type === 'EVENT_TYPE_MATCH' || formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                  Target Event Types {formData.type === 'EVENT_TYPE_MATCH' ? '*' : '(Optional Filter)'}
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  padding: '0.4rem',
                  background: 'var(--tl-bg-surface)',
                  border: '1px solid var(--tl-border-default)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {VALID_EVENT_TYPES.map(t => {
                    const isSelected = formData.condition.eventTypes?.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleToggleEventType(t)}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--tl-accent-primary, #6366F1)' : '1px solid var(--tl-border-default)',
                          background: isSelected ? 'var(--tl-accent-subtle, rgba(99, 102, 241, 0.12))' : 'transparent',
                          color: isSelected ? 'var(--tl-text-primary)' : 'var(--tl-text-muted)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem' }}>
                  Selected: {formData.condition.eventTypes?.length || 0} types
                </div>
              </div>
            )}

            {/* PATTERN_MATCH Regex or Substring List */}
            {(formData.type === 'PATTERN_MATCH' || formData.type === 'COMPOSITE') && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                  Message Patterns / Keywords {formData.type === 'PATTERN_MATCH' ? '*' : '(Optional)'}
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    placeholder="e.g. Failed password|Invalid user|DROP TABLE"
                    value={newPatternInput}
                    onChange={e => setNewPatternInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPattern(); } }}
                    style={{ flex: 1, fontSize: '0.72rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddPattern}
                    disabled={!newPatternInput.trim()}
                  >
                    Add Pattern
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {formData.condition.patterns?.map((pat, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        background: 'var(--tl-bg-surface)',
                        border: '1px solid var(--tl-border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--tl-text-primary)'
                      }}
                    >
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{pat}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer', color: 'var(--tl-text-muted)' }}
                        onClick={() => handleRemovePattern(pat)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source IP Watchlist / Allowlist */}
            {(formData.type === 'IP_MATCH' || formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.25rem', display: 'block' }}>
                  Source IP Watchlist / Allowlist {formData.type === 'IP_MATCH' ? '*' : '(Optional Watchlist)'}
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    placeholder="e.g. 198.51.100.55 or 203.0.113.10"
                    value={newIpInput}
                    onChange={e => { setNewIpInput(e.target.value); setIpInputError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddIp(); } }}
                    style={{ flex: 1, fontSize: '0.72rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddIp}
                    disabled={!newIpInput.trim()}
                  >
                    Add IP
                  </button>
                </div>

                {ipInputError && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--tl-sev-critical)', marginBottom: '0.3rem' }}>
                    {ipInputError}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {formData.condition.ipAddresses?.map(ip => (
                    <span
                      key={ip}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        background: 'var(--tl-bg-surface)',
                        border: '1px solid var(--tl-border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--tl-text-primary)'
                      }}
                    >
                      <span style={{ fontFamily: 'var(--tl-font-mono, monospace)' }}>{ip}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer', color: 'var(--tl-text-muted)' }}
                        onClick={() => handleRemoveIp(ip)}
                      />
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem' }}>
                  Configured: {formData.condition.ipAddresses?.length || 0} IPs
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Rule Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal && Boolean(ruleToDelete)}
        onClose={() => { setShowDeleteModal(false); setRuleToDelete(null); }}
        title="Delete Detection Rule"
        icon={<AlertTriangle size={16} />}
        confirmText="Confirm Delete"
        confirmVariant="danger"
        confirmLoading={actionLoading}
        onConfirm={confirmDelete}
        maxWidth="460px"
      >
        <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete the detection rule <strong>&ldquo;{ruleToDelete?.name}&rdquo;</strong>?
          <div style={{ marginTop: '0.6rem', color: 'var(--tl-text-muted)', fontSize: '0.73rem' }}>
            This will halt correlation evaluations for this rule immediately in the detection engine. This action cannot be undone.
          </div>
        </div>
      </Modal>
    </div>
  );
}
