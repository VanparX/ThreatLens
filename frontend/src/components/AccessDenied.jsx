import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccessDenied({ requiredRole = 'ADMIN', message }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentRoles = user?.roles?.length ? user.roles.join(', ') : 'VIEWER';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem 1rem'
    }}>
      <div className="panel" style={{
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(251, 191, 36, 0.12)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sev-high)'
        }}>
          <ShieldAlert size={28} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message || `This section requires the ${requiredRole} role. Your account does not possess the required clearance.`}
          </p>
        </div>

        <div style={{
          width: '100%',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          fontSize: '0.78rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Signed in as:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.username || 'Unknown'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Assigned role(s):</span>
            <span style={{ color: 'var(--sev-high)', fontFamily: 'var(--font-mono)' }}>{currentRoles}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Required role:</span>
            <span style={{ color: 'var(--sev-low)', fontFamily: 'var(--font-mono)' }}>{requiredRole}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ArrowLeft size={13} /> Go Back
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/dashboard')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <LayoutDashboard size={13} /> Security Overview
          </button>
        </div>
      </div>
    </div>
  );
}

