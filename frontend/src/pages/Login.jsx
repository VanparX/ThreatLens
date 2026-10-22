import React, { useState } from 'react';
import { Shield, Lock, User, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('ChangeMe!Admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Check SOC credentials.');
    }
  };

  const fillDemoCreds = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #0d172b 0%, #080c14 70%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Cyber Grid Accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      <div className="soc-card soc-card-glow" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        background: 'rgba(18, 26, 43, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 1rem auto',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(59, 130, 246, 0.25))',
            border: '1px solid var(--neon-cyan)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={32} color="var(--neon-cyan)" />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Threat<span style={{ color: 'var(--neon-cyan)' }}>Lens</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            SOC Incident Response & Threat Monitoring Console
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--neon-rose)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Analyst Call-Sign / Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="soc-input"
                style={{ paddingLeft: '2.5rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Security Token / Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="soc-input"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
          >
            <span>{loading ? 'Authenticating Session...' : 'Establish Secure SOC Session'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Credentials Access */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '0.65rem' }}>
            <KeyRound size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
            <span>Evaluation Credentials:</span>
          </div>
          <button
            type="button"
            onClick={() => fillDemoCreds('admin', 'ChangeMe!Admin123')}
            style={{
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              color: 'var(--neon-cyan)',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            Load Admin: admin / ChangeMe!Admin123
          </button>
        </div>
      </div>
    </div>
  );
}
