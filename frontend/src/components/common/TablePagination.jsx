import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * TablePagination — Enterprise SOC data grid pagination bar.
 *
 * Designed for 0-indexed Spring Boot / Pageable backend integrations.
 *
 * @param {number} page - Current page (0-indexed).
 * @param {number} totalPages - Total number of pages.
 * @param {number} [totalElements] - Total records count.
 * @param {number} [pageSize] - Current items per page.
 * @param {number[]} [pageSizeOptions=[10, 25, 50, 100]] - Page size choices.
 * @param {Function} onPageChange - Callback invoked with new 0-indexed page number: `(page) => void`.
 * @param {Function} [onPageSizeChange] - Optional callback for changing page size: `(size) => void`.
 * @param {boolean} [loading=false] - Disables controls during data requests.
 * @param {string} [itemLabel='items'] - Plural noun describing records (e.g. 'events', 'logs', 'alerts').
 * @param {boolean} [showQuickJumper=false] - Show first / last jump buttons.
 * @param {string} [className=''] - Additional CSS classes.
 * @param {React.CSSProperties} [style={}] - Inline styling overrides.
 */
export default function TablePagination({
  page = 0,
  totalPages = 1,
  totalElements,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  loading = false,
  itemLabel = 'items',
  showQuickJumper = false,
  className = '',
  style = {}
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const currentPageDisplay = page + 1;

  const canGoPrev = page > 0 && !loading;
  const canGoNext = page < safeTotalPages - 1 && !loading;

  // Calculate item range for "Showing X–Y of Z"
  let rangeText = null;
  if (totalElements !== undefined && pageSize) {
    const start = totalElements === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalElements);
    rangeText = `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${totalElements.toLocaleString()} ${itemLabel}`;
  } else if (totalElements !== undefined) {
    rangeText = `${totalElements.toLocaleString()} total ${itemLabel}`;
  }

  return (
    <div
      className={`pagination ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        borderTop: '1px solid var(--tl-border-subtle)',
        background: 'var(--tl-bg-surface-nav)',
        fontSize: '0.75rem',
        color: 'var(--tl-text-muted)',
        fontFamily: 'var(--font-sans)',
        ...style
      }}
    >
      {/* Left section: Item range & Optional page size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {rangeText && (
          <span style={{ color: 'var(--tl-text-secondary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {rangeText}
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Rows:</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              style={{
                width: 'auto',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                height: '26px',
                minHeight: '26px',
                borderRadius: 'var(--radius-sm)'
              }}
              aria-label="Select items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: Page counter & Navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
        <span className="page-info" style={{ fontVariantNumeric: 'tabular-nums', margin: '0 0.25rem' }}>
          Page <strong style={{ color: 'var(--tl-text-primary)' }}>{currentPageDisplay}</strong> of{' '}
          <strong style={{ color: 'var(--tl-text-primary)' }}>{safeTotalPages}</strong>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {showQuickJumper && (
            <button
              type="button"
              className="btn btn-secondary btn-xs btn-icon"
              onClick={() => onPageChange(0)}
              disabled={!canGoPrev}
              title="First Page"
              aria-label="First page"
            >
              <ChevronsLeft size={13} />
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrev}
            aria-label="Previous page"
            style={{ padding: '0.25rem 0.55rem' }}
          >
            <ChevronLeft size={13} /> Prev
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            aria-label="Next page"
            style={{ padding: '0.25rem 0.55rem' }}
          >
            Next <ChevronRight size={13} />
          </button>

          {showQuickJumper && (
            <button
              type="button"
              className="btn btn-secondary btn-xs btn-icon"
              onClick={() => onPageChange(safeTotalPages - 1)}
              disabled={!canGoNext}
              title="Last Page"
              aria-label="Last page"
            >
              <ChevronsRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

