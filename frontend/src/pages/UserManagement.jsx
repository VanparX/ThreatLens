import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Mail,
  Fingerprint,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatIST } from '../utils/dateUtils';

const AVAILABLE_ROLES = [
  {
    role: 'ADMIN',
    label: 'Lead SOC Administrator',
    shortLabel: 'Admin',
    badgeClass: 'badge-critical',
    icon: ShieldAlert,
    description: 'Full governance clearance. Grants user management, audit trail inspection, detection rules, and system configuration access.',
    permissions: [
      'Manage User Accounts & Clearance Roles',
      'Inspect Immutable SOC Audit Trail',
      'Author, Edit, & Enable Correlation Rules',
      'Full Incident & Alert Lifecycle Governance',
      'System Configuration & Platform Settings'
    ]
  },
  {
    role: 'SECURITY_ANALYST',
    label: 'Security Analyst',
    shortLabel: 'Analyst',
    badgeClass: 'badge-high',
    icon: Activity,
    description: 'Operational investigation clearance. Grants alert triage, incident response, rule building, and threat intelligence capabilities.',
    permissions: [
      'Investigate & Triage Security Alerts',
      'Create, Update, & Escalate Incidents',
      'Acknowledge & Investigate Threat Detections',
      'Configure Detection Rules & Search Queries',
      'Query Ingested Telemetry in Log Explorer'
    ]
  },
  {
    role: 'VIEWER',
    label: 'Security Viewer',
    shortLabel: 'Viewer',
    badgeClass: 'badge-neutral',
    icon: Eye,
    description: 'Surveillance & telemetry clearance. Grants read-only observation of security dashboards, alerts, and ingested log feeds.',
    permissions: [
      'Read-Only Command Hub & Dashboard Access',
      'View Security Alerts & Incident Reports',
      'Inspect Active Threat Detections',
      'Run Read-Only Log Explorer Queries',
      'No Mutating or State-Change Privileges'
    ]
  }
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  // Data states
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    analystCount: 0,
    viewerCount: 0,
    enabledCount: 0,
    disabledCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selfDemotionAcknowledged, setSelfDemotionAcknowledged] = useState(false);
  const [roleModalError, setRoleModalError] = useState(null);

  // Status Confirmation Modal
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Load KPI Statistics
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/auth/users/stats');
      const d = res?.data ?? res;
      if (d) {
        setStats({
          totalUsers: Number(d.totalUsers || 0),
          adminCount: Number(d.adminCount || 0),
          analystCount: Number(d.analystCount || 0),
          viewerCount: Number(d.viewerCount || 0),
          enabledCount: Number(d.enabledCount || 0),
          disabledCount: Number(d.disabledCount || 0)
        });
      }
    } catch (err) {
      console.warn('Failed to load user statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Users Page
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size: pageSize
      };
      if (roleFilter) {
        params.role = roleFilter;
      }
      const res = await api.get('/auth/users', { params });
      const d = res?.data ?? res;
      const content = d?.content ?? (Array.isArray(d) ? d : []);
      setUsers(content);
      setTotalPages(d?.totalPages ?? 1);
      setTotalElements(d?.totalElements ?? content.length);

      // Keep selectedUser in sync if updated
      if (selectedUser) {
        const updated = content.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err?.message || 'Failed to retrieve registered users. Please check backend connectivity.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, roleFilter, selectedUser?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, roleFilter]);

  // Client-side search and status filtering over current server-fetched page
  const filteredUsers = useMemo(() => {
    let result = users;

    // Filter by account active status
    if (statusFilter === 'ENABLED') {
      result = result.filter(u => u.enabled === true);
    } else if (statusFilter === 'DISABLED') {
      result = result.filter(u => u.enabled === false);
    }

    // Filter by text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
    }

    return result;
  }, [users, statusFilter, searchQuery]);

  // Clear all filters
  const handleClearFilters = () => {
    setRoleFilter('');
    setStatusFilter('ALL');
    setSearchQuery('');
    setPage(0);
  };

  // Open Role Management Modal
  const handleOpenRoleModal = (userToEdit, e) => {
    if (e) e.stopPropagation();
    setRoleModalUser(userToEdit);
    setSelectedRoles(new Set(userToEdit.roles || []));
    setSelfDemotionAcknowledged(false);
    setRoleModalError(null);
  };

  // Toggle role selection in modal
  const handleToggleRole = (roleKey) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleKey)) {
        next.delete(roleKey);
      } else {
        next.add(roleKey);
      }
      return next;
    });
    setRoleModalError(null);
  };

  // Save Role Changes
  const handleSaveRoles = async () => {
    if (!roleModalUser) return;

    if (selectedRoles.size === 0) {
      setRoleModalError('A user must have at least one role assigned. The backend rejects empty role sets.');
      return;
    }

    const isTargetCurrentUser = currentUser?.username === roleModalUser.username;
    const removingAdminFromSelf = isTargetCurrentUser && roleModalUser.roles.includes('ADMIN') && !selectedRoles.has('ADMIN');

    if (removingAdminFromSelf && !selfDemotionAcknowledged) {
      setRoleModalError('You must acknowledge the self-demotion risk before saving this change.');
      return;
    }

    setModalSubmitting(true);
    setRoleModalError(null);

    try {
      // Backend expects a JSON array of roles: ["ADMIN", "SECURITY_ANALYST"]
      const rolesArray = Array.from(selectedRoles);
      const res = await api.put(`/auth/users/${roleModalUser.id}/roles`, rolesArray);
      const updatedUser = res?.data ?? res;

      setActionSuccess(`Roles for ${roleModalUser.username} were updated successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);

      setRoleModalUser(null);
      await loadUsers();
      await loadStats();

      if (selectedUser?.id === roleModalUser.id) {
        setSelectedUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to update roles:', err);
      setRoleModalError(err?.message || 'Failed to update roles. Please verify administrator privileges.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Status Confirmation Modal
  const handleOpenStatusModal = (userToToggle, e) => {
    if (e) e.stopPropagation();
    setStatusModalUser(userToToggle);
  };

  // Execute Status Toggle (Enable/Disable)
  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;

    setStatusSubmitting(true);
    try {
      const newStatus = !statusModalUser.enabled;
      const res = await api.put(`/auth/users/${statusModalUser.id}/status?enabled=${newStatus}`);
      const updatedUser = res?.data ?? res;

      setActionSuccess(
        `Account for ${statusModalUser.username} has been ${newStatus ? 'enabled' : 'disabled'}.`
      );
      setTimeout(() => setActionSuccess(null), 5000);

      setStatusModalUser(null);
      await loadUsers();
      await loadStats();

      if (selectedUser?.id === statusModalUser.id) {
        setSelectedUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err?.message || 'Failed to change user account status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 className="page-title">User Management</h1>
            <span className="badge badge-critical" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
              ADMIN CLEARANCE ONLY
            </span>
          </div>
          <p className="page-subtitle">
            Directory of provisioned SOC identities, RBAC clearance assignments, and account lifecycle controls.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadUsers(); loadStats(); }}
            disabled={loading || statsLoading}
            title="Refresh user list & metrics"
          >
            <RefreshCw size={13} className={loading || statsLoading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {actionSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: 'var(--sev-low)',
          fontSize: '0.82rem'
        }}>
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setActionSuccess(null)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: 'var(--sev-critical)',
          fontSize: '0.82rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-cell">
          <div className="kpi-label">TOTAL REGISTERED USERS</div>
          <div className="kpi-value accent">
            {statsLoading ? '–' : stats.totalUsers}
          </div>
          <div className="kpi-sub">
            {stats.enabledCount} active • {stats.disabledCount} disabled
          </div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">LEAD ADMINISTRATORS</div>
          <div className="kpi-value critical">
            {statsLoading ? '–' : stats.adminCount}
          </div>
          <div className="kpi-sub">Full system governance &amp; RBAC authority</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">SECURITY ANALYSTS</div>
          <div className="kpi-value warning">
            {statsLoading ? '–' : stats.analystCount}
          </div>
          <div className="kpi-sub">Alert triage, detections &amp; SOAR workflows</div>
        </div>

        <div className="kpi-cell">
          <div className="kpi-label">SECURITY VIEWERS</div>
          <div className="kpi-value" style={{ color: 'var(--text-secondary)' }}>
            {statsLoading ? '–' : stats.viewerCount}
          </div>
          <div className="kpi-sub">Read-only monitoring &amp; log exploration</div>
        </div>
      </div>

      {/* Main Workspace (Table + Detail Drawer) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedUser ? '1fr 420px' : '1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0
      }}>
        {/* Table Panel */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Filter & Search Bar */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            {/* Search Input */}
            <div className="search-wrap" style={{ maxWidth: '300px', flex: 1, minWidth: '200px' }}>
              <Search size={13} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Filter loaded users (name, email, ID)…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.78rem' }}
              />
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Role:</span>
                <select
                  className="form-select"
                  style={{ width: '135px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  value={roleFilter}
                  onChange={e => {
                    setRoleFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Status:</span>
                <select
                  className="form-select"
                  style={{ width: '115px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ENABLED">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>

              {/* Page Size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Size:</span>
                <select
                  className="form-select"
                  style={{ width: '70px', padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {(roleFilter || statusFilter !== 'ALL' || searchQuery) && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleClearFilters}
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="table-wrap" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>User / Identity</th>
                  <th>Email Address</th>
                  <th style={{ width: '190px' }}>Assigned Roles</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '165px' }}>Registered (IST)</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} style={{ padding: '0.75rem 1rem' }}>
                        <div className="skeleton" style={{ height: '32px', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: '3.5rem 1.5rem' }}>
                        <Users size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        <div className="empty-state-title">No user records found</div>
                        <div className="empty-state-text">
                          {roleFilter || statusFilter !== 'ALL' || searchQuery
                            ? 'No users match your active filter criteria. Try resetting your search or role selection.'
                            : 'No user accounts are registered in the ThreatLens database.'}
                        </div>
                        {(roleFilter || statusFilter !== 'ALL' || searchQuery) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '0.75rem' }}
                            onClick={handleClearFilters}
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUser?.id === u.id;
                    const isSelf = currentUser?.username === u.username;

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(isSelected ? null : u)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--surface-elevated)' : undefined
                        }}
                      >
                        {/* User / Identity */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isSelf ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-elevated)',
                              border: `1px solid ${isSelf ? 'rgba(59, 130, 246, 0.4)' : 'var(--border)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: isSelf ? '#60a5fa' : 'var(--text-secondary)',
                              flexShrink: 0
                            }}>
                              {(u.username || '?').substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                  {u.username}
                                </span>
                                {isSelf && (
                                  <span
                                    className="badge badge-low"
                                    style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}
                                  >
                                    You
                                  </span>
                                )}
                              </div>
                              <div style={{
                                fontSize: '0.68rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}>
                                {u.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {u.email || '–'}
                        </td>

                        {/* Roles */}
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {u.roles && u.roles.length > 0 ? (
                              u.roles.map(r => {
                                const roleMeta = AVAILABLE_ROLES.find(x => x.role === r);
                                return (
                                  <span
                                    key={r}
                                    className={`badge ${roleMeta?.badgeClass || 'badge-neutral'}`}
                                    style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    {r === 'ADMIN' && <ShieldAlert size={10} />}
                                    {r === 'SECURITY_ANALYST' && <Activity size={10} />}
                                    {r === 'VIEWER' && <Eye size={10} />}
                                    {roleMeta?.shortLabel || r}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No roles assigned</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          {u.enabled ? (
                            <span className="badge badge-low" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle size={10} /> Active
                            </span>
                          ) : (
                            <span className="badge badge-critical" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <UserX size={10} /> Disabled
                            </span>
                          )}
                        </td>

                        {/* Registered */}
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {formatIST(u.createdAt, { fallback: 'Never / Pending' })}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={e => handleOpenRoleModal(u, e)}
                              title="Modify Clearance Roles"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Shield size={11} /> Roles
                            </button>
                            <button
                              className={`btn ${u.enabled ? 'btn-ghost' : 'btn-secondary'} btn-xs`}
                              onClick={e => handleOpenStatusModal(u, e)}
                              title={u.enabled ? 'Deactivate Account' : 'Re-activate Account'}
                              style={{
                                color: u.enabled ? 'var(--sev-high)' : 'var(--sev-low)',
                                borderColor: u.enabled ? 'transparent' : 'rgba(16, 185, 129, 0.4)'
                              }}
                            >
                              {u.enabled ? <Lock size={11} /> : <Unlock size={11} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{
            padding: '0.65rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            background: 'var(--surface-nav)'
          }}>
            <div>
              Showing {totalElements === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} users
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

        {/* User Detail Inspection Drawer */}
        {selectedUser && (
          <div className="panel" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1.1rem',
            overflowY: 'auto'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)'
                }}>
                  {(selectedUser.username || '?').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedUser.username}
                    </h3>
                    {currentUser?.username === selectedUser.username && (
                      <span className="badge badge-low" style={{ fontSize: '0.6rem' }}>You</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedUser(null)}
                aria-label="Close drawer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={e => handleOpenRoleModal(selectedUser, e)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Shield size={13} />
                Manage Roles
              </button>
              <button
                className={`btn ${selectedUser.enabled ? 'btn-ghost' : 'btn-secondary'} btn-sm`}
                onClick={e => handleOpenStatusModal(selectedUser, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  color: selectedUser.enabled ? 'var(--sev-high)' : 'var(--sev-low)',
                  border: selectedUser.enabled ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)'
                }}
              >
                {selectedUser.enabled ? <Lock size={13} /> : <Unlock size={13} />}
                {selectedUser.enabled ? 'Deactivate' : 'Activate'}
              </button>
            </div>

            {/* Identity & Account Card */}
            <div style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  ACCOUNT CLEARANCE STATUS
                </span>
                {selectedUser.enabled ? (
                  <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
                    <CheckCircle size={10} style={{ marginRight: '3px' }} /> Active
                  </span>
                ) : (
                  <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                    <UserX size={10} style={{ marginRight: '3px' }} /> Disabled
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Identifier:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.72rem' }}>
                    {selectedUser.id}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Account Created:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {formatIST(selectedUser.createdAt, { fallback: 'Never / Pending' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Successful Login:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {formatIST(selectedUser.lastLoginAt, { fallback: 'Never / Pending' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Role Breakdown Matrix */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                ASSIGNED CLEARANCE TIERS ({selectedUser.roles?.length || 0})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {selectedUser.roles && selectedUser.roles.length > 0 ? (
                  selectedUser.roles.map(r => {
                    const roleMeta = AVAILABLE_ROLES.find(x => x.role === r);
                    const RoleIcon = roleMeta?.icon || Shield;

                    return (
                      <div
                        key={r}
                        style={{
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          <RoleIcon size={14} style={{ color: r === 'ADMIN' ? 'var(--sev-critical)' : (r === 'SECURITY_ANALYST' ? '#60a5fa' : 'var(--text-secondary)') }} />
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {roleMeta?.label || r}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                          {roleMeta?.description}
                        </p>
                        {roleMeta?.permissions && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {roleMeta.permissions.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--sev-low)', fontSize: '0.75rem' }}>✓</span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    color: 'var(--sev-critical)',
                    fontSize: '0.78rem'
                  }}>
                    <AlertTriangle size={18} style={{ margin: '0 auto 0.4rem auto' }} />
                    No roles assigned to this account. Assign at least one role to grant platform access.
                  </div>
                )}
              </div>
            </div>

            {/* Self-Account Banner */}
            {currentUser?.username === selectedUser.username && (
              <div style={{
                marginTop: 'auto',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.74rem',
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={14} style={{ flexShrink: 0 }} />
                <span>You are inspecting your currently authenticated administrative session.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Management Modal */}
      {roleModalUser && (
        <div className="modal-overlay" onClick={() => !modalSubmitting && setRoleModalUser(null)}>
          <div
            className="modal"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} />
                  Manage Clearance Roles
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Assign security roles for user <strong style={{ color: 'var(--text-primary)' }}>{roleModalUser.username}</strong>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setRoleModalUser(null)}
                disabled={modalSubmitting}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Architecture Notice */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Role Set Replacement:</strong> Saving roles replaces the entire role set for this user in MongoDB via <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>PUT /api/auth/users/{'{id}'}/roles</code>. At least one role must remain selected.
              </div>

              {/* Role Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {AVAILABLE_ROLES.map(({ role, label, description, badgeClass, icon: Icon }) => {
                  const isChecked = selectedRoles.has(role);

                  return (
                    <label
                      key={role}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: isChecked ? 'var(--surface-elevated)' : 'transparent',
                        border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all var(--t-fast)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRole(role)}
                        disabled={modalSubmitting}
                        style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                          <Icon size={14} />
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {label}
                          </span>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.6rem' }}>
                            {role}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                          {description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Self-Demotion Warning */}
              {currentUser?.username === roleModalUser.username && roleModalUser.roles.includes('ADMIN') && !selectedRoles.has('ADMIN') && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--sev-critical)', fontWeight: 600, fontSize: '0.8rem' }}>
                    <ShieldAlert size={16} />
                    CRITICAL SAFEGUARD: Self-Demotion Warning
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    You are removing the <strong>ADMIN</strong> role from your own account. Saving this change will immediately revoke your administrative privileges, lock you out of User Management and Audit Logs, and cannot be undone from this session!
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer', marginTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      checked={selfDemotionAcknowledged}
                      onChange={e => setSelfDemotionAcknowledged(e.target.checked)}
                    />
                    <span>I understand I will immediately lose administrative access to ThreatLens.</span>
                  </label>
                </div>
              )}

              {/* Last Admin Safeguard Notification */}
              {stats.adminCount === 1 && roleModalUser.roles.includes('ADMIN') && !selectedRoles.has('ADMIN') && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--sev-high)',
                  fontSize: '0.75rem'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Final Administrator Alert:</strong> There is currently only 1 administrator registered. Demoting this user will leave the system without any administrator accounts!
                  </span>
                </div>
              )}

              {/* Modal Error Alert */}
              {roleModalError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--sev-critical)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={14} />
                  <span>{roleModalError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRoleModalUser(null)}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveRoles}
                disabled={
                  modalSubmitting ||
                  selectedRoles.size === 0 ||
                  (currentUser?.username === roleModalUser.username &&
                   roleModalUser.roles.includes('ADMIN') &&
                   !selectedRoles.has('ADMIN') &&
                   !selfDemotionAcknowledged)
                }
              >
                {modalSubmitting ? (
                  <>
                    <RefreshCw size={12} className="spin" />
                    Updating Roles…
                  </>
                ) : (
                  'Save Role Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Status Confirmation Modal */}
      {statusModalUser && (
        <div className="modal-overlay" onClick={() => !statusSubmitting && setStatusModalUser(null)}>
          <div
            className="modal"
            style={{ maxWidth: '440px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusModalUser.enabled ? <Lock size={16} /> : <Unlock size={16} />}
                {statusModalUser.enabled ? 'Deactivate User Account' : 'Reactivate User Account'}
              </h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setStatusModalUser(null)}
                disabled={statusSubmitting}
              >
                <X size={14} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {currentUser?.username === statusModalUser.username && statusModalUser.enabled ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  color: 'var(--sev-critical)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    <ShieldAlert size={15} />
                    Cannot Disable Active Session Account
                  </div>
                  You cannot deactivate your own active account while logged in. To deactivate this administrator account, another administrator must perform the action.
                </div>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    Are you sure you want to {statusModalUser.enabled ? 'deactivate' : 'reactivate'} the account for <strong style={{ color: 'var(--text-primary)' }}>{statusModalUser.username}</strong>?
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {statusModalUser.enabled
                      ? 'Disabled accounts cannot authenticate or obtain JWT tokens from the ThreatLens API.'
                      : 'Reactivating this account will restore authentication access with their previously assigned roles.'}
                  </p>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStatusModalUser(null)}
                disabled={statusSubmitting}
              >
                Cancel
              </button>
              {!(currentUser?.username === statusModalUser.username && statusModalUser.enabled) && (
                <button
                  type="button"
                  className={`btn ${statusModalUser.enabled ? 'btn-danger' : 'btn-primary'} btn-sm`}
                  onClick={handleConfirmStatusToggle}
                  disabled={statusSubmitting}
                >
                  {statusSubmitting ? (
                    <>
                      <RefreshCw size={12} className="spin" />
                      Updating…
                    </>
                  ) : (
                    statusModalUser.enabled ? 'Deactivate Account' : 'Reactivate Account'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

