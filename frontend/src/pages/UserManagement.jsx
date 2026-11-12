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
  Lock,
  Unlock,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Mail,
  UserPlus,
  UserCheck,
  UserX,
  AlertCircle,
  Info
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
  Modal,
  FilterBar
} from '../components/common';

/**
 * Supported RBAC Role Registry for ThreatLens SOC operations.
 */
export const AVAILABLE_ROLES = [
  {
    role: 'ADMIN',
    label: 'Lead SOC Administrator',
    shortLabel: 'Admin',
    badgeVariant: 'critical',
    icon: ShieldAlert,
    description: 'Full governance clearance. Grants user management, audit trail inspection, detection rules authoring, and platform configuration.',
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
    badgeVariant: 'warning',
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
    badgeVariant: 'neutral',
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

/**
 * UserManagement — Concept A: Precision SOC Console
 * SOC Identity Governance, Role-Based Access Control & Account Lifecycle Management
 */
export default function UserManagement({
  initialUsers = null,
  initialStats = null,
  initialSelectedUser = null,
  initialRoleModalUser = null,
  initialStatusModalUser = null,
  initialProvisionModalOpen = false,
  initialPage = 0,
  initialPageSize = 20,
  initialTotalPages = null,
  initialTotalElements = null,
  initialRoleFilter = '',
  initialStatusFilter = 'ALL'
} = {}) {
  const { user: currentUser, isAdmin } = useAuth();

  // Data states
  const [users, setUsers] = useState(initialUsers || []);
  const [stats, setStats] = useState(initialStats || {
    totalUsers: 0,
    adminCount: 0,
    analystCount: 0,
    viewerCount: 0,
    enabledCount: 0,
    disabledCount: 0
  });
  const [loading, setLoading] = useState(!initialUsers);
  const [statsLoading, setStatsLoading] = useState(!initialStats);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? (initialUsers ? 1 : 1));
  const [totalElements, setTotalElements] = useState(initialTotalElements ?? (initialUsers ? initialUsers.length : 0));

  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Detail Drawer
  const [selectedUser, setSelectedUser] = useState(initialSelectedUser);

  // Role Management Modal
  const [roleModalUser, setRoleModalUser] = useState(initialRoleModalUser);
  const [selectedRoles, setSelectedRoles] = useState(
    new Set(initialRoleModalUser?.roles || [])
  );
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selfDemotionAcknowledged, setSelfDemotionAcknowledged] = useState(false);
  const [roleModalError, setRoleModalError] = useState(null);

  // Account Status Confirmation Modal
  const [statusModalUser, setStatusModalUser] = useState(initialStatusModalUser);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // User Provisioning Modal
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(initialProvisionModalOpen);
  const [provisionUsername, setProvisionUsername] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionRoles, setProvisionRoles] = useState(new Set(['VIEWER']));
  const [provisionSubmitting, setProvisionSubmitting] = useState(false);
  const [provisionError, setProvisionError] = useState(null);

  // Load KPI Statistics from backend
  const loadStats = useCallback(async () => {
    if (!isAdmin) {
      setStatsLoading(false);
      return;
    }
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
  }, [isAdmin]);

  // Load Users Page from backend
  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
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

      // Keep selectedUser in sync if currently viewed
      if (selectedUser) {
        const updated = content.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      const msg = err?.response?.status === 403
        ? 'Access forbidden: Administrative privilege required to access User Management.'
        : (err?.message || 'Failed to retrieve registered users. Please check backend connectivity.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, pageSize, roleFilter, selectedUser?.id]);

  useEffect(() => {
    if (initialStats === null) {
      loadStats();
    }
  }, [loadStats, initialStats]);

  useEffect(() => {
    if (initialUsers === null) {
      loadUsers();
    }
  }, [loadUsers, initialUsers]);

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

  // Execute Status Toggle (Enable/Disable via accurate endpoints)
  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;

    setStatusSubmitting(true);
    try {
      const isEnabling = !statusModalUser.enabled;
      // ThreatLens backend routes: /api/auth/users/{id}/enable and /api/auth/users/{id}/disable
      const endpoint = isEnabling
        ? `/auth/users/${statusModalUser.id}/enable`
        : `/auth/users/${statusModalUser.id}/disable`;

      const res = await api.put(endpoint);
      const updatedUser = res?.data ?? res;

      setActionSuccess(
        `Account for ${statusModalUser.username} has been ${isEnabling ? 'enabled' : 'disabled'}.`
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

  // Open Provision User Modal
  const handleOpenProvisionModal = () => {
    setProvisionUsername('');
    setProvisionEmail('');
    setProvisionPassword('');
    setProvisionRoles(new Set(['VIEWER']));
    setProvisionError(null);
    setIsProvisionModalOpen(true);
  };

  // Toggle provision role
  const handleToggleProvisionRole = (roleKey) => {
    setProvisionRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleKey)) {
        if (next.size > 1) next.delete(roleKey);
      } else {
        next.add(roleKey);
      }
      return next;
    });
  };

  // Submit User Provisioning
  const handleProvisionUser = async () => {
    if (!provisionUsername.trim() || !provisionEmail.trim() || !provisionPassword.trim()) {
      setProvisionError('Username, email, and password are all required fields.');
      return;
    }
    if (provisionUsername.trim().length < 3) {
      setProvisionError('Username must be at least 3 characters.');
      return;
    }
    if (!provisionEmail.includes('@') || !provisionEmail.includes('.')) {
      setProvisionError('Please enter a valid email address.');
      return;
    }
    if (provisionPassword.length < 8) {
      setProvisionError('Password must be at least 8 characters long.');
      return;
    }

    setProvisionSubmitting(true);
    setProvisionError(null);

    try {
      const payload = {
        username: provisionUsername.trim(),
        email: provisionEmail.trim(),
        password: provisionPassword,
        roles: Array.from(provisionRoles)
      };

      await api.post('/auth/register', payload);

      setActionSuccess(`User identity "${provisionUsername.trim()}" has been provisioned successfully.`);
      setTimeout(() => setActionSuccess(null), 5000);

      setIsProvisionModalOpen(false);
      await loadUsers();
      await loadStats();
    } catch (err) {
      console.error('Failed to provision user:', err);
      setProvisionError(err?.message || 'Failed to provision user identity.');
    } finally {
      setProvisionSubmitting(false);
    }
  };

  // Non-admin fallback safeguard
  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div
          className="panel"
          style={{
            maxWidth: '540px',
            textAlign: 'center',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
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
          <div style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.5rem' }}>
              Administrative Clearance Required
            </h3>
            <p style={{ fontSize: '0.814rem', color: 'var(--tl-text-secondary)', lineHeight: 1.5 }}>
              Access to Identity Governance and User Management is strictly restricted to operators with the <code>ADMIN</code> role.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* Precision SOC Page Header */}
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
              THREATLENS // IDENTITY GOVERNANCE & ACCESS CONTROL
            </span>
            <span
              className="badge badge-critical"
              style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.45rem',
                letterSpacing: '0.06em',
                fontWeight: 700
              }}
            >
              CLEARANCE: ADMIN ONLY
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            User Management
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.814rem', color: 'var(--tl-text-secondary)', margin: 0 }}>
            Directory of provisioned SOC identities, role-based access control (RBAC), and account lifecycle governance.
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleOpenProvisionModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={13} />
            Provision User
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadUsers(); loadStats(); }}
            disabled={loading || statsLoading}
            title="Refresh user directory and telemetry metrics"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} className={loading || statsLoading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {actionSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--tl-sev-low)',
            fontSize: '0.814rem'
          }}
        >
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setActionSuccess(null)}
            style={{ marginLeft: 'auto' }}
            aria-label="Dismiss success notification"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--tl-sev-critical)',
            fontSize: '0.814rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto' }}
            aria-label="Dismiss error notification"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* KPI Metric Strip — Genuine database-wide data from GET /api/auth/users/stats */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.85rem'
        }}
      >
        <KPICard
          label="TOTAL IDENTITIES"
          value={statsLoading ? '–' : stats.totalUsers}
          sub="Database-wide registered users"
          variant="accent"
          loading={statsLoading}
          icon={Users}
        />
        <KPICard
          label="ACTIVE ACCOUNTS"
          value={statsLoading ? '–' : stats.enabledCount}
          sub={`${stats.disabledCount} deactivated accounts`}
          variant="healthy"
          loading={statsLoading}
          icon={ShieldCheck}
        />
        <KPICard
          label="LEAD ADMINISTRATORS"
          value={statsLoading ? '–' : stats.adminCount}
          sub="Full system governance clearance"
          variant="critical"
          loading={statsLoading}
          icon={ShieldAlert}
        />
        <KPICard
          label="OPERATIONAL ANALYSTS"
          value={statsLoading ? '–' : stats.analystCount}
          sub={`${stats.viewerCount} read-only viewers`}
          variant="warning"
          loading={statsLoading}
          icon={Activity}
        />
      </div>

      {/* Main Workspace (Table Panel + Slide Drawer) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedUser ? '1fr 420px' : '1fr',
          gap: '1rem',
          flex: 1,
          minHeight: 0
        }}
      >
        {/* Table Panel */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Filter & Control Bar */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Filter loaded users (name, email, ID)…"
            searchMaxWidth={280}
            hasActiveFilters={Boolean(roleFilter || statusFilter !== 'ALL' || searchQuery)}
            onClear={handleClearFilters}
            resultCount={
              <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>
                {roleFilter || statusFilter !== 'ALL' || searchQuery
                  ? `Showing ${filteredUsers.length} of ${users.length} loaded users (${stats.totalUsers} total)`
                  : `Showing ${filteredUsers.length} of ${stats.totalUsers} users`}
              </span>
            }
          >
            {/* Server-Side Role Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>
              <span>Role:</span>
              <select
                className="form-select"
                style={{ width: '140px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
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

            {/* Client-Side Account Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>
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
          </FilterBar>

          {/* User Inventory Table */}
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
                      <div className="empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <Users size={36} style={{ color: 'var(--tl-text-muted)', opacity: 0.5, margin: '0 auto 0.5rem auto' }} />
                        <div className="empty-state-title" style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                          No user records found
                        </div>
                        <div className="empty-state-text" style={{ fontSize: '0.78rem', color: 'var(--tl-text-muted)', marginTop: '0.25rem' }}>
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
                          background: isSelected ? 'var(--tl-bg-elevated, rgba(255, 255, 255, 0.04))' : undefined
                        }}
                      >
                        {/* User / Identity */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: isSelf ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-elevated, #1a2234)',
                                border: `1px solid ${isSelf ? 'rgba(59, 130, 246, 0.4)' : 'var(--tl-border, #2d3748)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: isSelf ? '#60a5fa' : 'var(--tl-text-secondary)',
                                flexShrink: 0
                              }}
                            >
                              {(u.username || '?').substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)', fontSize: '0.82rem' }}>
                                  {u.username}
                                </span>
                                {isSelf && (
                                  <span
                                    className="badge badge-low"
                                    style={{ fontSize: '0.58rem', padding: '0.08rem 0.35rem', fontWeight: 700 }}
                                  >
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  color: 'var(--tl-text-muted)',
                                  fontFamily: 'var(--font-mono)',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {u.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email Address */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)' }}>
                          {u.email || '–'}
                        </td>

                        {/* Assigned Roles */}
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {u.roles && u.roles.length > 0 ? (
                              u.roles.map(r => {
                                const roleMeta = AVAILABLE_ROLES.find(x => x.role === r);
                                return (
                                  <span
                                    key={r}
                                    className={`badge badge-${roleMeta?.badgeVariant || 'neutral'}`}
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
                              <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>No roles assigned</span>
                            )}
                          </div>
                        </td>

                        {/* Account Status */}
                        <td>
                          <StatusBadge
                            status={u.enabled ? 'ENABLED' : 'DISABLED'}
                            label={u.enabled ? 'Active' : 'Disabled'}
                            size="sm"
                          />
                        </td>

                        {/* Registered Timestamp (IST) */}
                        <td style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {formatIST(u.createdAt, { fallback: 'Never / Pending' })}
                        </td>

                        {/* Action Triggers */}
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
                              title={u.enabled ? 'Deactivate Account' : 'Reactivate Account'}
                              style={{
                                color: u.enabled ? 'var(--tl-sev-high)' : 'var(--tl-sev-low)',
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

          {/* Standardized SOC Table Pagination */}
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={newSize => {
              setPageSize(newSize);
              setPage(0);
            }}
            loading={loading}
            itemLabel="identities"
          />
        </div>

        {/* User Detail Inspection Drawer */}
        {selectedUser && (
          <DetailDrawer
            isOpen={Boolean(selectedUser)}
            onClose={() => setSelectedUser(null)}
            title={selectedUser.username}
            subtitle={`SOC Identity: ${selectedUser.id}`}
            mode="docked"
            badge={
              <StatusBadge
                status={selectedUser.enabled ? 'ENABLED' : 'DISABLED'}
                label={selectedUser.enabled ? 'Active' : 'Disabled'}
                size="sm"
              />
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    color: selectedUser.enabled ? 'var(--tl-sev-high)' : 'var(--tl-sev-low)',
                    border: selectedUser.enabled ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {selectedUser.enabled ? <Lock size={13} /> : <Unlock size={13} />}
                  {selectedUser.enabled ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              {/* Identity & Account Card */}
              <div
                style={{
                  background: 'var(--tl-bg-elevated, #161e2e)',
                  border: '1px solid var(--tl-border, #2d3748)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--tl-text-secondary)', letterSpacing: '0.04em' }}>
                    ACCOUNT CLEARANCE STATUS
                  </span>
                  <StatusBadge
                    status={selectedUser.enabled ? 'ENABLED' : 'DISABLED'}
                    label={selectedUser.enabled ? 'Active' : 'Disabled'}
                    size="xs"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Identifier:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--tl-text-primary)', fontSize: '0.72rem' }}>
                      {selectedUser.id}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Username:</span>
                    <span style={{ fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      {selectedUser.username}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Email Address:</span>
                    <span style={{ color: 'var(--tl-text-secondary)' }}>
                      {selectedUser.email || '–'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tl-text-muted)' }}>Registration Date:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--tl-text-primary)' }}>
                      {formatIST(selectedUser.createdAt, { fallback: 'Never / Pending' })}
                    </span>
                  </div>
                </div>

                {/* Immutable Properties Disclosure */}
                <div
                  style={{
                    marginTop: '0.25rem',
                    padding: '0.5rem 0.65rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--tl-border, #2d3748)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    color: 'var(--tl-text-muted)',
                    lineHeight: 1.4
                  }}
                >
                  <strong style={{ color: 'var(--tl-text-secondary)' }}>Immutable Identity:</strong> Username and email address are immutable identity properties in ThreatLens and cannot be modified after registration to protect forensic integrity.
                </div>
              </div>

              {/* Role Breakdown Matrix */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tl-text-secondary)', marginBottom: '0.6rem' }}>
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
                            background: 'var(--tl-bg-elevated, #161e2e)',
                            border: '1px solid var(--tl-border-subtle, #2d3748)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                            <RoleIcon
                              size={14}
                              style={{
                                color: r === 'ADMIN'
                                  ? 'var(--tl-sev-critical)'
                                  : (r === 'SECURITY_ANALYST' ? '#60a5fa' : 'var(--tl-text-secondary)')
                              }}
                            />
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--tl-text-primary)' }}>
                              {roleMeta?.label || r}
                            </span>
                            <span className={`badge badge-${roleMeta?.badgeVariant || 'neutral'}`} style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
                              {r}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-muted)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                            {roleMeta?.description}
                          </p>
                          {roleMeta?.permissions && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {roleMeta.permissions.map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--tl-text-secondary)' }}>
                                  <span style={{ color: 'var(--tl-sev-low)', fontSize: '0.75rem' }}>✓</span>
                                  <span>{p}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        padding: '1rem',
                        background: 'var(--tl-bg-elevated, #161e2e)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: 'var(--tl-sev-critical)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <AlertTriangle size={18} style={{ margin: '0 auto 0.4rem auto' }} />
                      No roles assigned to this account. Assign at least one role to grant platform access.
                    </div>
                  )}
                </div>
              </div>

              {/* Audit & Governance Disclosure */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.72rem',
                  color: 'var(--tl-text-secondary)',
                  lineHeight: 1.4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#93c5fd', marginBottom: '0.2rem' }}>
                  <Shield size={12} />
                  SOC Audit Trail Protection
                </div>
                Account lifecycle operations and role modifications are recorded in the SOC Audit Trail with administrator identity and timestamps.
              </div>

              {/* Self-Account Banner */}
              {currentUser?.username === selectedUser.username && (
                <div
                  style={{
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
                  }}
                >
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>You are inspecting your currently authenticated administrative session.</span>
                </div>
              )}
            </div>
          </DetailDrawer>
        )}
      </div>

      {/* Role Management Modal */}
      {roleModalUser && (
        <Modal
          isOpen={Boolean(roleModalUser)}
          onClose={() => !modalSubmitting && setRoleModalUser(null)}
          title="Manage Clearance Roles"
          icon={<Shield size={16} />}
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
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
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>
              Assign security roles for user <strong style={{ color: 'var(--tl-text-primary)' }}>{roleModalUser.username}</strong>
            </div>

            {/* Architecture Notice */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--tl-text-secondary)',
                lineHeight: 1.4
              }}
            >
              <strong style={{ color: 'var(--tl-text-primary)' }}>Role Set Replacement:</strong> Saving roles replaces the entire role set for this identity in MongoDB via <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>PUT /api/auth/users/{'{id}'}/roles</code>. At least one role must remain selected.
            </div>

            {/* Role Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {AVAILABLE_ROLES.map(({ role, label, description, badgeVariant, icon: Icon }) => {
                const isChecked = selectedRoles.has(role);

                return (
                  <label
                    key={role}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: isChecked ? 'var(--tl-bg-elevated, #161e2e)' : 'transparent',
                      border: `1px solid ${isChecked ? 'var(--tl-accent-primary, #3b82f6)' : 'var(--tl-border, #2d3748)'}`,
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
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--tl-text-primary)' }}>
                          {label}
                        </span>
                        <span className={`badge badge-${badgeVariant}`} style={{ fontSize: '0.6rem' }}>
                          {role}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-muted)', margin: 0, lineHeight: 1.35 }}>
                        {description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Self-Demotion Warning */}
            {currentUser?.username === roleModalUser.username && roleModalUser.roles.includes('ADMIN') && !selectedRoles.has('ADMIN') && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--tl-sev-critical)', fontWeight: 600, fontSize: '0.8rem' }}>
                  <ShieldAlert size={16} />
                  CRITICAL SAFEGUARD: Self-Demotion Warning
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  You are removing the <strong>ADMIN</strong> role from your own account. Saving this change will immediately revoke your administrative privileges, lock you out of User Management and Audit Logs, and cannot be undone from this session!
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--tl-text-primary)', cursor: 'pointer', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={selfDemotionAcknowledged}
                    onChange={e => setSelfDemotionAcknowledged(e.target.checked)}
                  />
                  <span>I understand I will immediately lose administrative access to ThreatLens.</span>
                </label>
              </div>
            )}

            {/* Last Admin Safeguard Alert */}
            {stats.adminCount === 1 && roleModalUser.roles.includes('ADMIN') && !selectedRoles.has('ADMIN') && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--tl-sev-high)',
                  fontSize: '0.75rem'
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Final Administrator Alert:</strong> There is currently only 1 administrator registered. Demoting this user will leave the system without any administrator accounts!
                </span>
              </div>
            )}

            {/* Modal Error Alert */}
            {roleModalError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--tl-sev-critical)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={14} />
                <span>{roleModalError}</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Account Status Confirmation Modal */}
      {statusModalUser && (
        <Modal
          isOpen={Boolean(statusModalUser)}
          onClose={() => !statusSubmitting && setStatusModalUser(null)}
          title={statusModalUser.enabled ? 'Deactivate User Account' : 'Reactivate User Account'}
          icon={statusModalUser.enabled ? <Lock size={16} /> : <Unlock size={16} />}
          maxWidth="440px"
          confirmText={statusModalUser.enabled ? 'Deactivate Account' : 'Reactivate Account'}
          confirmVariant={statusModalUser.enabled ? 'danger' : 'primary'}
          confirmLoading={statusSubmitting}
          confirmDisabled={statusSubmitting || (currentUser?.username === statusModalUser.username && statusModalUser.enabled)}
          onConfirm={handleConfirmStatusToggle}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--tl-text-secondary)', lineHeight: 1.45 }}>
            {currentUser?.username === statusModalUser.username && statusModalUser.enabled ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  color: 'var(--tl-sev-critical)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  <ShieldAlert size={15} />
                  Cannot Disable Active Session Account
                </div>
                You cannot deactivate your own active account while logged in. To deactivate this administrator account, another administrator must perform the action.
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 0.75rem 0' }}>
                  Are you sure you want to {statusModalUser.enabled ? 'deactivate' : 'reactivate'} the account for <strong style={{ color: 'var(--tl-text-primary)' }}>{statusModalUser.username}</strong>?
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--tl-text-muted)' }}>
                  {statusModalUser.enabled
                    ? 'Disabled accounts cannot authenticate or obtain JWT tokens from the ThreatLens API. Existing active sessions will expire upon token expiration.'
                    : 'Reactivating this account will restore authentication access with their previously assigned roles.'}
                </p>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* User Provisioning Modal */}
      {isProvisionModalOpen && (
        <Modal
          isOpen={isProvisionModalOpen}
          onClose={() => !provisionSubmitting && setIsProvisionModalOpen(false)}
          title="Provision SOC User Identity"
          icon={<UserPlus size={16} />}
          maxWidth="480px"
          confirmText="Provision Identity"
          confirmVariant="primary"
          confirmLoading={provisionSubmitting}
          confirmDisabled={provisionSubmitting || !provisionUsername.trim() || !provisionEmail.trim() || !provisionPassword.trim()}
          onConfirm={handleProvisionUser}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', margin: 0 }}>
              Provision a new user identity in the ThreatLens security directory.
            </p>

            {/* Username Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Username *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. jdoe or sec_analyst"
                value={provisionUsername}
                onChange={e => setProvisionUsername(e.target.value)}
                disabled={provisionSubmitting}
                style={{ fontSize: '0.8rem' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
                3–50 characters. Immutable after registration.
              </span>
            </div>

            {/* Email Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Email Address *
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. jdoe@threatlens.io"
                value={provisionEmail}
                onChange={e => setProvisionEmail(e.target.value)}
                disabled={provisionSubmitting}
                style={{ fontSize: '0.8rem' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
                Used for notification dispatch and communications. Immutable after creation.
              </span>
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Initial Password *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Minimum 8 characters"
                value={provisionPassword}
                onChange={e => setProvisionPassword(e.target.value)}
                disabled={provisionSubmitting}
                style={{ fontSize: '0.8rem' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
                Hashed with BCrypt by backend authentication service. Never stored in plaintext.
              </span>
            </div>

            {/* Initial Role Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Initial Clearance Roles
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--tl-text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={provisionRoles.has('VIEWER')}
                    onChange={() => handleToggleProvisionRole('VIEWER')}
                    disabled={provisionSubmitting}
                  />
                  <span>VIEWER (Read-Only)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--tl-text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={provisionRoles.has('SECURITY_ANALYST')}
                    onChange={() => handleToggleProvisionRole('SECURITY_ANALYST')}
                    disabled={provisionSubmitting}
                  />
                  <span>SECURITY_ANALYST</span>
                </label>
              </div>
            </div>

            {/* Architecture Disclosure for Admin Allocation */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem',
                fontSize: '0.72rem',
                color: 'var(--tl-text-secondary)',
                lineHeight: 1.4
              }}
            >
              <strong style={{ color: '#93c5fd' }}>Architectural Safeguard:</strong> The backend <code>POST /api/auth/register</code> endpoint automatically removes initial <code>ADMIN</code> allocation for security. To grant Lead Administrator privileges, provision the account first, then assign <code>ADMIN</code> via the "Manage Roles" dialog.
            </div>

            {/* Error Notification */}
            {provisionError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--tl-sev-critical)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={14} />
                <span>{provisionError}</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
