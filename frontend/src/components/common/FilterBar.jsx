import React from 'react';
import { Search, X, Filter } from 'lucide-react';

/**
 * FilterBar — Reusable SOC query, filter and control bar.
 *
 * @param {string} [searchQuery=''] - Controlled search query input value.
 * @param {Function} [onSearchChange] - Search input change handler: `(value) => void`.
 * @param {Function} [onSearchSubmit] - Callback triggered when Enter is pressed or Apply button is clicked.
 * @param {string} [searchPlaceholder='Search by keyword, IP, process…'] - Placeholder text.
 * @param {number} [searchMaxWidth=320] - Max width of search input box in px.
 * @param {Function} [onClear] - Clear filters handler.
 * @param {boolean} [hasActiveFilters=false] - Whether filters are active (shows 'Clear' button).
 * @param {React.ReactNode} [children] - Filter dropdowns, toggles, or secondary inputs.
 * @param {React.ReactNode} [actions] - Right-aligned action buttons (e.g. Export, Refresh, Add).
 * @param {string|React.ReactNode} [resultCount] - Optional total filtered count chip or label.
 * @param {boolean} [showApplyButton=false] - Explicit Apply button next to search.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline styling overrides.
 */
export default function FilterBar({
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search by keyword, IP, process…',
  searchMaxWidth = 320,
  onClear,
  hasActiveFilters = false,
  children,
  actions,
  resultCount,
  showApplyButton = false,
  className = '',
  style = {}
}) {
  const isSearchEnabled = Boolean(onSearchChange);
  const showClear = Boolean(onClear && (hasActiveFilters || Boolean(searchQuery)));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit(searchQuery);
    }
  };

  return (
    <div
      className={`filter-bar ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.6rem',
        padding: '0.65rem 1rem',
        background: 'var(--tl-bg-surface)',
        border: '1px solid var(--tl-border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1rem',
        ...style
      }}
    >
      {/* Search Input Box */}
      {isSearchEnabled && (
        <div
          className="search-wrap"
          style={{
            position: 'relative',
            flex: '1 1 200px',
            maxWidth: `${searchMaxWidth}px`,
            minWidth: '160px'
          }}
        >
          <Search
            size={13}
            className="search-icon"
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tl-text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            style={{
              paddingLeft: '2rem',
              paddingRight: searchQuery ? '1.8rem' : '0.65rem',
              height: '32px',
              fontSize: '0.786rem'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="btn btn-ghost btn-icon"
              style={{
                position: 'absolute',
                right: '0.2rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0.2rem',
                color: 'var(--tl-text-muted)'
              }}
              title="Clear search"
              aria-label="Clear search input"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Optional Apply Search button */}
      {showApplyButton && onSearchSubmit && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onSearchSubmit(searchQuery)}
          style={{ height: '32px', padding: '0 0.75rem' }}
        >
          Apply
        </button>
      )}

      {/* Filter Children (Dropdown selects, category toggles) */}
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {children}
        </div>
      )}

      {/* Clear Filters Button */}
      {showClear && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          style={{
            height: '32px',
            color: 'var(--tl-text-secondary)',
            fontSize: '0.75rem'
          }}
        >
          <X size={12} /> Clear Filters
        </button>
      )}

      {/* Right-aligned Result Count and Actions */}
      {(resultCount || actions) && (
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap'
          }}
        >
          {resultCount && (
            <span
              style={{
                fontSize: '0.714rem',
                color: 'var(--tl-text-muted)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {resultCount}
            </span>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

