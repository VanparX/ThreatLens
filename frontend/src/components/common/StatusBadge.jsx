import React from 'react';

/**
 * Status and Severity mapping registry for SOC operations.
 */
const STATUS_REGISTRY = {
  // Severity Levels
  CRITICAL:      { variant: 'critical', dotClass: 'status-dot-error',   hasDot: false },
  HIGH:          { variant: 'high',     dotClass: 'status-dot-warning', hasDot: false },
  MEDIUM:        { variant: 'medium',   dotClass: 'status-dot-neutral', hasDot: false },
  LOW:           { variant: 'low',      dotClass: 'status-dot-online',  hasDot: false },
  INFO:          { variant: 'info',     dotClass: 'status-dot-neutral', hasDot: false },

  // Alert & Incident Lifecycle Statuses
  OPEN:          { variant: 'critical', dotClass: 'status-dot-error',   hasDot: true,  pulse: true },
  INVESTIGATING: { variant: 'high',     dotClass: 'status-dot-warning', hasDot: true,  pulse: true },
  CONTAINED:     { variant: 'medium',   dotClass: 'status-dot-warning', hasDot: true,  pulse: false },
  ACKNOWLEDGED:  { variant: 'medium',   dotClass: 'status-dot-warning', hasDot: true,  pulse: false },
  ASSIGNED:      { variant: 'info',     dotClass: 'status-dot-neutral', hasDot: true,  pulse: false },
  RESOLVED:      { variant: 'low',      dotClass: 'status-dot-online',  hasDot: true,  pulse: false },
  CLOSED:        { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: true,  pulse: false },

  // Detection Lifecycle Statuses
  NEW:            { variant: 'high',     dotClass: 'status-dot-warning', hasDot: true,  pulse: true },
  ALERT_CREATED:  { variant: 'accent',   dotClass: 'status-dot-busy',    hasDot: true,  pulse: false },
  FALSE_POSITIVE: { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: false, pulse: false },

  // Operational & Health Statuses
  ONLINE:        { variant: 'low',      dotClass: 'status-dot-online',  hasDot: true,  pulse: true },
  OFFLINE:       { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: true,  pulse: false },
  DEGRADED:      { variant: 'critical', dotClass: 'status-dot-error',   hasDot: true,  pulse: true },
  UNKNOWN:       { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: true,  pulse: false },

  // Rule State
  ENABLED:       { variant: 'low',      dotClass: 'status-dot-online',  hasDot: true,  pulse: false },
  DISABLED:      { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: true,  pulse: false },
  ARMED:         { variant: 'low',      dotClass: 'status-dot-online',  hasDot: true,  pulse: true },
  STANDBY:       { variant: 'neutral',  dotClass: 'status-dot-neutral', hasDot: true,  pulse: false }
};

/**
 * StatusBadge — Standardized SOC badge for severities and operational lifecycles.
 *
 * @param {string} status - Raw status or severity key (e.g. 'CRITICAL', 'OPEN', 'RESOLVED').
 * @param {'critical'|'high'|'medium'|'low'|'info'|'neutral'|'accent'} [variant] - Explicit color override.
 * @param {boolean} [dot] - Whether to render a leading status dot indicator.
 * @param {boolean} [pulse=false] - Whether the status dot should pulse.
 * @param {'xs'|'sm'|'md'} [size='sm'] - Badge size variant.
 * @param {string|React.ReactNode} [label] - Explicit display text (defaults to children or status).
 * @param {React.ReactNode} [children] - Optional badge content.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline styles.
 */
export default function StatusBadge({
  status = '',
  variant,
  dot,
  pulse = false,
  size = 'sm',
  label,
  children,
  className = '',
  style = {}
}) {
  const normalizedKey = String(status || '').trim().toUpperCase();
  const config = STATUS_REGISTRY[normalizedKey] || {
    variant: 'neutral',
    dotClass: 'status-dot-neutral',
    hasDot: false,
    pulse: false
  };

  const badgeVariant = variant || config.variant || 'neutral';
  const showDot = dot !== undefined ? dot : config.hasDot;
  const shouldPulse = pulse || config.pulse;

  const sizeStyles = {
    xs: { fontSize: '0.62rem', padding: '0.1rem 0.35rem', gap: '0.2rem' },
    sm: { fontSize: '0.714rem', padding: '0.15rem 0.45rem', gap: '0.25rem' },
    md: { fontSize: '0.786rem', padding: '0.2rem 0.6rem', gap: '0.35rem' }
  };

  const currentSizeStyle = sizeStyles[size] || sizeStyles.sm;
  const displayText = label || children || status;

  return (
    <span
      className={`badge badge-${badgeVariant} ${className}`.trim()}
      style={{
        ...currentSizeStyle,
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        ...style
      }}
    >
      {showDot && (
        <span
          className={`status-dot ${config.dotClass}`}
          style={{
            width: size === 'xs' ? '4px' : '5px',
            height: size === 'xs' ? '4px' : '5px',
            animation: shouldPulse ? 'pulse-dot 1.8s infinite ease-in-out' : 'none'
          }}
        />
      )}
      <span>{displayText}</span>
    </span>
  );
}

