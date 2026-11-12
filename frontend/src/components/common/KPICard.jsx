import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPICard — Precision SOC telemetry metric card.
 *
 * @param {string|React.ReactNode} label - Metric title / dimension.
 * @param {string|number|React.ReactNode} value - Main telemetry value (tabular numeric).
 * @param {string|React.ReactNode} [sub] - Supporting context or period description.
 * @param {'default'|'critical'|'warning'|'healthy'|'accent'|'neutral'} [variant='default'] - Value color theme.
 * @param {{ direction: 'up'|'down'|'neutral', value: string, label?: string, isPositive?: boolean }} [trend] - Optional trend indicator.
 * @param {React.ReactNode} [icon] - Supporting icon component.
 * @param {string|React.ReactNode} [badge] - Header badge text or component.
 * @param {string} [badgeVariant='neutral'] - Badge severity variant.
 * @param {boolean} [loading=false] - Shimmer skeleton loading state.
 * @param {Function} [onClick] - Interactive click handler.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline style overrides.
 */
export default function KPICard({
  label,
  value,
  sub,
  variant = 'default',
  trend,
  icon: Icon,
  badge,
  badgeVariant = 'neutral',
  loading = false,
  onClick,
  className = '',
  style = {}
}) {
  const isClickable = Boolean(onClick);

  const variantColorMap = {
    critical: 'var(--tl-sev-critical)',
    warning:  'var(--tl-sev-high)',
    healthy:  'var(--tl-sev-low)',
    accent:   'var(--tl-accent-primary)',
    neutral:  'var(--tl-text-primary)',
    default:  'var(--tl-text-primary)'
  };

  const valueColor = variantColorMap[variant] || 'var(--tl-text-primary)';

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={`kpi-cell ${isClickable ? 'clickable ' : ''}${className}`.trim()}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        ...style
      }}
    >
      {/* Header: Label + Optional Badge / Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          {Icon && (
            <span style={{ color: 'var(--tl-text-muted)', display: 'inline-flex', alignItems: 'center' }}>
              {React.isValidElement(Icon) ? Icon : React.createElement(Icon, { size: 13 })}
            </span>
          )}
          <span className="kpi-label" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>

        {badge && (
          <span className={`badge badge-${badgeVariant}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      {loading ? (
        <div className="skeleton" style={{ height: '1.75rem', width: '60%', margin: '0.2rem 0', borderRadius: 'var(--radius-sm)' }} />
      ) : (
        <div
          className="kpi-value"
          style={{
            color: valueColor,
            fontFamily: 'var(--font-sans)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem'
          }}
        >
          {value}
        </div>
      )}

      {/* Footer: Trend Indicator + Supporting Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {trend && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.714rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: trend.isPositive === false
                ? 'var(--tl-sev-critical)'
                : trend.isPositive === true
                  ? 'var(--tl-sev-low)'
                  : 'var(--tl-text-secondary)'
            }}
          >
            {trend.direction === 'up' && <TrendingUp size={11} />}
            {trend.direction === 'down' && <TrendingDown size={11} />}
            {trend.direction === 'neutral' && <Minus size={11} />}
            <span>{trend.value}</span>
            {trend.label && (
              <span style={{ fontWeight: 400, color: 'var(--tl-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {trend.label}
              </span>
            )}
          </div>
        )}

        {sub && !trend && (
          <div className="kpi-sub" style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)' }}>
            {sub}
          </div>
        )}
        {sub && trend && (
          <div className="kpi-sub" style={{ fontSize: '0.714rem', color: 'var(--tl-text-muted)', marginLeft: 'auto' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

