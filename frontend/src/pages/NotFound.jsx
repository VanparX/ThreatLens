import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Terminal } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      padding: '2rem 1rem'
    }}>
      <div className="panel" style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          <ShieldAlert size={28} />
        </div>

        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--sev-high)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.25rem'
          }}>
            HTTP 404
          </div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Console Route Not Found
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            The requested security operations endpoint or dashboard route does not exist in the ThreatLens console.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/command-hub')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Terminal size={13} /> Command Hub
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

