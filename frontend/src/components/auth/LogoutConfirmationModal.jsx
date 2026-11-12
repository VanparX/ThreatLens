import React from 'react';
import { LogOut, AlertTriangle, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal';

/**
 * LogoutConfirmationModal — Confirmation dialog for SOC session termination.
 *
 * Implements accessible, keyboard-trapped modal dialog warning before session teardown.
 *
 * @param {boolean} isOpen - Modal visibility.
 * @param {Function} onClose - Callback invoked when user cancels (Esc or Cancel button).
 * @param {Function} onConfirm - Callback invoked when user confirms termination.
 * @param {boolean} [isLoading=false] - Disables repeated clicks and displays loading state.
 */
export default function LogoutConfirmationModal({
  isOpen = false,
  onClose,
  onConfirm,
  isLoading = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Logout"
      icon={<LogOut size={16} style={{ color: 'var(--tl-sev-critical, #EF4444)' }} />}
      confirmText="Yes, Logout"
      cancelText="Cancel"
      onConfirm={onConfirm}
      confirmVariant="danger"
      confirmLoading={isLoading}
      confirmDisabled={isLoading}
      maxWidth="460px"
      ariaLabel="Confirm Logout Dialog"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--tl-sev-critical-bg, rgba(239, 68, 68, 0.12))',
              border: '1px solid var(--tl-sev-critical-border, rgba(239, 68, 68, 0.28))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tl-sev-critical, #EF4444)',
              flexShrink: 0
            }}
            aria-hidden="true"
          >
            <ShieldAlert size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--tl-text-primary, #F1F5F9)',
                margin: 0,
                lineHeight: 1.4
              }}
            >
              Are you sure you want to terminate your ThreatLens session?
            </p>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--tl-text-muted, #78889B)',
                margin: 0,
                lineHeight: 1.45
              }}
            >
              You will need to authenticate again to access the SOC workspace.
            </p>
          </div>
        </div>

        <div
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--tl-text-muted, #78889B)',
            background: 'var(--tl-bg-canvas, #0B0D10)',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm, 4px)',
            border: '1px solid var(--tl-border-subtle, #1E232B)'
          }}
        >
          AUTH CLEARANCE: ACTIVE SESSION WILL BE INVALIDATED
        </div>
      </div>
    </Modal>
  );
}

