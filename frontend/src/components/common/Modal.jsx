import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Modal — Reusable dialog container for security workflows, actions, and confirmations.
 *
 * @param {boolean} isOpen - Modal visibility state.
 * @param {Function} onClose - Callback invoked to dismiss the modal.
 * @param {string|React.ReactNode} title - Dialog title.
 * @param {React.ReactNode} [icon] - Optional leading icon for title (e.g. AlertTriangle or Shield).
 * @param {React.ReactNode} children - Modal body contents.
 * @param {string} [confirmText] - Label for confirmation action button. If omitted, no confirm button is rendered.
 * @param {string} [cancelText='Cancel'] - Label for cancel/dismiss button.
 * @param {Function} [onConfirm] - Callback for confirmation button click.
 * @param {'primary'|'danger'|'secondary'} [confirmVariant='primary'] - Button theme for confirm action.
 * @param {boolean} [confirmDisabled=false] - Disables confirm button.
 * @param {boolean} [confirmLoading=false] - Shows loading spinner on confirm button.
 * @param {string} [maxWidth='540px'] - Maximum dialog width.
 * @param {React.ReactNode} [footer] - Custom footer content overriding standard buttons.
 * @param {string} [ariaLabel] - Accessibility label.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline styling overrides.
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  icon,
  children,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  confirmDisabled = false,
  confirmLoading = false,
  maxWidth = '540px',
  footer,
  ariaLabel,
  className = '',
  style = {}
}) {
  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !confirmLoading) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, confirmLoading]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (typeof title === 'string' ? title : 'Dialog')}
        style={{
          maxWidth,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--tl-shadow-lg)',
          ...style
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {icon && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {icon}
              </span>
            )}
            <span>{title}</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={confirmLoading}
            aria-label="Close dialog"
            title="Close dialog (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

        {/* Footer */}
        {footer !== undefined ? (
          footer && <div className="modal-footer">{footer}</div>
        ) : (
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={confirmLoading}
            >
              {cancelText}
            </button>

            {confirmText && (
              <button
                type="button"
                className={`btn btn-${confirmVariant} btn-sm`}
                onClick={onConfirm}
                disabled={confirmDisabled || confirmLoading}
              >
                {confirmLoading ? (
                  <>
                    <Loader2 size={13} className="spin" /> Processing…
                  </>
                ) : (
                  confirmText
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

