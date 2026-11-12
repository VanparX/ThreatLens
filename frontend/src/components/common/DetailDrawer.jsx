import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * DetailDrawer — Slide-over contextual inspection drawer for threat alerts and detections.
 *
 * Supports both modal slide-over (overlay) and side-by-side panel (docked) layouts.
 *
 * @param {boolean} isOpen - Drawer visibility state.
 * @param {Function} onClose - Callback invoked to close drawer.
 * @param {string|React.ReactNode} title - Drawer header title.
 * @param {string|React.ReactNode} [subtitle] - Contextual subtitle or rule category.
 * @param {React.ReactNode} [badge] - Optional status or severity badge in header.
 * @param {React.ReactNode} [headerActions] - Action buttons placed in header alongside close.
 * @param {React.ReactNode} children - Main drawer scrollable content.
 * @param {React.ReactNode} [footer] - Optional sticky footer controls.
 * @param {string} [width='460px'] - Maximum drawer width.
 * @param {'overlay'|'docked'} [mode='overlay'] - Display mode ('overlay' = slide-over with backdrop, 'docked' = side-by-side workspace panel).
 * @param {string} [ariaLabel='Detail drawer'] - Accessibility label.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline style overrides.
 */
export default function DetailDrawer({
  isOpen = false,
  onClose,
  title,
  subtitle,
  badge,
  headerActions,
  children,
  footer,
  width = '460px',
  mode = 'overlay',
  ariaLabel = 'Detail drawer',
  className = '',
  style = {}
}) {
  const drawerRef = useRef(null);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll in overlay mode
  useEffect(() => {
    if (isOpen && mode === 'overlay') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const drawerContent = (
    <aside
      ref={drawerRef}
      className={`detail-drawer ${className}`.trim()}
      role="dialog"
      aria-modal={mode === 'overlay'}
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: width,
        height: '100%',
        background: 'var(--tl-bg-surface-nav)',
        borderLeft: '1px solid var(--tl-border-default)',
        boxShadow: mode === 'overlay' ? 'var(--tl-shadow-lg)' : 'none',
        overflow: 'hidden',
        zIndex: mode === 'overlay' ? 'var(--z-modal)' : 1,
        ...style
      }}
    >
      {/* Header */}
      <div
        className="detail-drawer-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--tl-border-subtle)',
          background: 'var(--tl-bg-surface)',
          gap: '0.75rem',
          flexShrink: 0
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {(badge || subtitle) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              {badge}
              {subtitle && (
                <span style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)' }}>
                  {subtitle}
                </span>
              )}
            </div>
          )}
          <h3
            style={{
              fontSize: '0.929rem',
              fontWeight: 600,
              color: 'var(--tl-text-primary)',
              margin: 0,
              lineHeight: 1.35,
              wordBreak: 'break-word'
            }}
          >
            {title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {headerActions}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close drawer"
            title="Close drawer (Esc)"
            style={{ color: 'var(--tl-text-secondary)', padding: '0.35rem' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {children}
      </div>

      {/* Sticky Footer Actions */}
      {footer && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--tl-border-subtle)',
            background: 'var(--tl-bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            flexShrink: 0
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  );

  if (mode === 'docked') {
    return drawerContent;
  }

  // Overlay Mode
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 11, 16, 0.65)',
        backdropFilter: 'blur(2px)',
        zIndex: 'var(--z-overlay)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        padding: 0,
        animation: 'fadeIn var(--t-fast) ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {drawerContent}
    </div>
  );
}

