import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Edit2,
  Trash2,
  Clock,
  User,
  Sliders,
  Check,
  Radar,
  ArrowRight,
  HelpCircle,
  Terminal,
  Activity
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

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

export default function RulesManager() {
  const { user, canWrite } = useAuth();

  // Rules Data & Pagination
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Rule for Inspection
  const [selectedRule, setSelectedRule] = useState(null);

  // Form & Modals
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal input helpers
  const [newIpInput, setNewIpInput] = useState('');
  const [newPatternInput, setNewPatternInput] = useState('');
  const [ipInputError, setIpInputError] = useState('');

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  // KPI Overview Metrics
  const [kpiStats, setKpiStats] = useState({
    totalRules: 0,
    enabledRules: 0,
    disabledRules: 0
  });

  const toast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Load KPI overview metrics
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

      // Refresh selected rule in-memory
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
  }, [loadRules]);

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
      if (selectedRule?.id === rule.id) setSelectedRule(updated || { ...rule, enabled: !rule.enabled });
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
    e.preventDefault();
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

    if (formData.type === 'THRESHOLD') {
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
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        severity: formData.severity,
        enabled: formData.enabled,
        condition: {
          thresholdCount: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Number(cond.thresholdCount) : undefined,
          thresholdWindowSeconds: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Number(cond.thresholdWindowSeconds) : undefined,
          groupBySourceIp: (formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') ? Boolean(cond.groupBySourceIp) : undefined,
          patterns: (formData.type === 'PATTERN_MATCH' || formData.type === 'COMPOSITE') ? cond.patterns : undefined,
          ipAddresses: cond.ipAddresses.length > 0 ? cond.ipAddresses : undefined,
          eventTypes: cond.eventTypes.length > 0 ? cond.eventTypes : undefined,
          severities: cond.severities.length > 0 ? cond.severities : undefined
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 52px - 3rem)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
              <span className="status-dot status-dot-online" style={{ width: '5px', height: '5px' }} />
              {kpiStats.enabledRules > 0
                ? `${kpiStats.enabledRules} ARMED DETECTION RULES ACTIVE`
                : 'NO ACTIVE RULES'}
            </span>
          </div>
          <h1 className="page-title">Detection Rules</h1>
          <p className="page-subtitle">
            Configure correlation logic, threshold sliding windows, IP watchlists, and pattern detection rules for the real-time SOC engine.
          </p>
        </div>

        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '145px' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Statuses</option>
            <option value="true">Enabled Only</option>
            <option value="false">Disabled Only</option>
          </select>

          <select
            className="form-select"
            style={{ width: '165px' }}
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Rule Types</option>
            {RULE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.value}</option>
            ))}
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={openCreateModal}
            disabled={!canWrite}
            title={!canWrite ? 'Analyst or Admin required' : 'Create new detection rule'}
          >
            <Plus size={13} /> New Rule
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadRules(); loadKpis(); }}
            disabled={loading}
            title="Refresh rules"
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
          <span><strong>Viewer Mode:</strong> You have read-only access to detection rules. Creating rules, updating threshold criteria, and enabling or disabling rules require Security Analyst or Admin clearance.</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total Rules Configured</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value">{kpiStats.totalRules || totalElements}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>definitions</span>
          </div>
          <div className="kpi-sub">Total registered detection policies</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Active &amp; Armed</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: 'var(--status-online)' }}>
              {kpiStats.enabledRules}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>evaluating</span>
          </div>
          <div className="kpi-sub">Actively monitoring ingested telemetry</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">Disabled / Standby</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="kpi-value" style={{ color: kpiStats.disabledRules > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
              {kpiStats.disabledRules}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>bypassed</span>
          </div>
          <div className="kpi-sub">Suspended or testing rules</div>
        </div>
      </div>

      {/* Main Workspace (Table + Detail Drawer) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedRule ? '1fr 450px' : '1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0
      }}>
        {/* Left Column: Rules Table */}
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
                placeholder="Filter loaded rules (names, types, IPs)…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                style={{ paddingLeft: '1.9rem', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Showing {filteredRules.length} of {rules.length} on current page • {totalElements} total in database
            </div>
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '40px' }} />
                ))}
              </div>
            ) : filteredRules.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Radar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                {searchQuery.trim() && rules.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Matching Detection Rules
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No rules on current page match &ldquo;{searchQuery}&rdquo;. Clear filter or switch pages.
                    </div>
                  </>
                ) : statusFilter || typeFilter ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Rules Match Selected Filters
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      No rules found matching status: {statusFilter === 'true' ? 'Enabled' : statusFilter === 'false' ? 'Disabled' : 'All'} and type: {typeFilter || 'All'}.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      No Detection Rules Configured
                    </div>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                      Deploy your first correlation rule to start analyzing ingested telemetry in real-time.
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
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '85px' }}>Status</th>
                    <th style={{ width: '85px' }}>Severity</th>
                    <th>Rule Name &amp; Description</th>
                    <th style={{ width: '130px' }}>Type</th>
                    <th>Condition Summary</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
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
                          background: isSelected ? 'var(--surface-elevated)' : undefined,
                          opacity: rule.enabled ? 1 : 0.6
                        }}
                      >
                        <td>
                          <span className={`status-pill ${rule.enabled ? 'online' : 'offline'}`}>
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${sev.toLowerCase()}`}>
                            {sev}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: '0.1rem' }}>
                            {rule.name}
                          </div>
                          {rule.description && (
                            <div style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary)',
                              maxWidth: '340px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {rule.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="col-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {rule.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                            <button
                              className={`btn btn-sm ${rule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                              disabled={actionLoading || !canWrite}
                              title={!canWrite ? 'Analyst or Admin required' : rule.enabled ? 'Disable rule' : 'Enable rule'}
                              onClick={(e) => handleToggle(rule, e)}
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                            >
                              {rule.enabled ? <XCircle size={11} /> : <CheckCircle size={11} />}
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </button>
                            {canWrite && (
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                title="Edit rule"
                                onClick={(e) => openEditModal(rule, e)}
                              >
                                <Edit2 size={12} />
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

        {/* Right Column: Rule Details Drawer */}
        {selectedRule && (
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
                  <span className={`badge badge-${(selectedRule.severity || 'high').toLowerCase()}`}>
                    {selectedRule.severity}
                  </span>
                  <span className={`status-pill ${selectedRule.enabled ? 'online' : 'offline'}`}>
                    {selectedRule.enabled ? 'Armed' : 'Disabled'}
                  </span>
                  <span className="col-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {selectedRule.type}
                  </span>
                </div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {selectedRule.name}
                </h2>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedRule(null)}
                title="Close drawer"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Actions Bar */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${selectedRule.enabled ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={actionLoading || !canWrite}
                  onClick={() => handleToggle(selectedRule)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {selectedRule.enabled ? <XCircle size={13} /> : <CheckCircle size={13} />}
                  {selectedRule.enabled ? 'Disable Rule' : 'Enable Rule'}
                </button>
                {canWrite && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(selectedRule)}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                )}
                {canWrite && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openDeleteModal(selectedRule)}
                    style={{ color: 'var(--sev-critical)' }}
                    title="Delete rule"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Description</div>
                <div style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  padding: '0.65rem',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {selectedRule.description || 'No description provided.'}
                </div>
              </div>

              {/* Condition Inspection */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Condition Configuration</div>
                <div style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  {/* Threshold settings */}
                  {(selectedRule.type === 'THRESHOLD' || selectedRule.type === 'COMPOSITE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="detail-row">
                        <span className="detail-key">Threshold Count</span>
                        <span className="detail-val col-mono" style={{ fontWeight: 600 }}>
                          &ge; {selectedRule.condition?.thresholdCount ?? 1} events
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-key">Sliding Window</span>
                        <span className="detail-val col-mono">
                          {selectedRule.condition?.thresholdWindowSeconds ?? 60} seconds ({((selectedRule.condition?.thresholdWindowSeconds ?? 60) / 60).toFixed(1)}m)
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-key">Source IP Grouping</span>
                        <span className="detail-val">
                          {selectedRule.condition?.groupBySourceIp ? (
                            <span style={{ color: 'var(--status-online)', fontWeight: 500 }}>
                              Enabled (Per-IP Independent Counter)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>
                              Disabled (Global Aggregate Counter)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Target Event Types */}
                  {selectedRule.condition?.eventTypes && selectedRule.condition.eventTypes.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Target Event Types ({selectedRule.condition.eventTypes.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {selectedRule.condition.eventTypes.map(t => (
                          <span key={t} className="badge badge-low" style={{ fontSize: '0.68rem' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patterns */}
                  {selectedRule.condition?.patterns && selectedRule.condition.patterns.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Match Patterns / Regex ({selectedRule.condition.patterns.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {selectedRule.condition.patterns.map((p, idx) => (
                          <div
                            key={idx}
                            className="col-mono"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.5rem',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--sev-high)'
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
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Source IP Watchlist / Allowlist ({selectedRule.condition.ipAddresses.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {selectedRule.condition.ipAddresses.map(ip => (
                          <span key={ip} className="col-mono" style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.45rem',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="detail-section" style={{ margin: 0 }}>
                <div className="detail-section-title">Rule Metadata</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="detail-row">
                    <span className="detail-key">Rule ID</span>
                    <span className="detail-val col-mono">{selectedRule.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Created By</span>
                    <span className="detail-val">{selectedRule.createdBy || 'system'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Created At</span>
                    <span className="detail-val col-mono">{formatIST(selectedRule.createdAt)}</span>
                  </div>
                  {selectedRule.updatedAt && (
                    <div className="detail-row">
                      <span className="detail-key">Last Updated</span>
                      <span className="detail-val col-mono">{formatIST(selectedRule.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Rule Builder Modal (Create & Edit) */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={16} style={{ color: 'var(--sev-high)' }} />
                {isEditing ? `Edit Rule: ${formData.name || 'Unnamed'}` : 'New Detection Rule'}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {/* Basic info */}
                <div className="form-group">
                  <label className="form-label">Rule Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. SSH Brute Force Detection"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="Explain the threat behavior, attacker tactics, or detection purpose…"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rule Type *</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                    >
                      {RULE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trigger Severity *</label>
                    <select
                      className="form-select"
                      value={formData.severity}
                      onChange={e => setFormData(f => ({ ...f, severity: e.target.value }))}
                    >
                      {SEVERITIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={e => setFormData(f => ({ ...f, enabled: e.target.checked }))}
                    />
                    <span>Arm rule immediately upon deployment (Enabled)</span>
                  </label>
                </div>

                {/* Dynamic Configuration based on Type */}
                <div style={{
                  padding: '0.85rem',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {RULE_TYPES.find(t => t.value === formData.type)?.label} Configuration
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {RULE_TYPES.find(t => t.value === formData.type)?.desc}
                  </div>

                  {/* THRESHOLD Configuration */}
                  {(formData.type === 'THRESHOLD' || formData.type === 'COMPOSITE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Threshold Count * (events)</label>
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
                          />
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Minimum event count to trigger an alert.
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Time Window * (seconds)</label>
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
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
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
                            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Group by Source IP (Independent Counter)
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
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
                      <label className="form-label">
                        Target Event Types {formData.type === 'EVENT_TYPE_MATCH' ? '*' : '(Optional Filter)'}
                      </label>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                        maxHeight: '130px',
                        overflowY: 'auto',
                        padding: '0.4rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
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
                                border: isSelected ? '1px solid var(--sev-high)' : '1px solid var(--border)',
                                background: isSelected ? 'var(--surface-elevated)' : 'transparent',
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: isSelected ? 600 : 400
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Selected: {formData.condition.eventTypes?.length || 0} types
                      </div>
                    </div>
                  )}

                  {/* PATTERN_MATCH Regex or Substring List */}
                  {(formData.type === 'PATTERN_MATCH' || formData.type === 'COMPOSITE') && (
                    <div className="form-group">
                      <label className="form-label">
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
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <span className="col-mono">{pat}</span>
                            <X
                              size={12}
                              style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
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
                      <label className="form-label">
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
                        <div style={{ fontSize: '0.68rem', color: 'var(--sev-critical)', marginBottom: '0.3rem' }}>
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
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <span className="col-mono">{ip}</span>
                            <X
                              size={12}
                              style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => handleRemoveIp(ip)}
                            />
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Configured: {formData.condition.ipAddresses?.length || 0} IPs
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading || !canWrite}>
                  {isEditing ? 'Save Changes' : 'Deploy Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {showDeleteModal && ruleToDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sev-critical)' }}>
                <AlertTriangle size={16} /> Delete Detection Rule
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the detection rule <strong>&ldquo;{ruleToDelete.name}&rdquo;</strong>?
              <div style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                This will halt correlation evaluations for this rule immediately. This action cannot be undone.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmDelete}
                disabled={actionLoading}
                style={{ background: 'var(--sev-critical)', borderColor: 'var(--sev-critical)' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
