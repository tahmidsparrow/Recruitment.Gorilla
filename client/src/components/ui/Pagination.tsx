import { Button } from 'react-bootstrap';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Prev/next pager with a result count. Replaces the copy of this markup that
 * lived in CandidatesPage, AuditLogPage and UsersPage.
 *
 * `totalPages` is derived here rather than passed in, so every caller rounds
 * the same way and a zero-result page still reads "Page 1 of 1" instead of
 * "Page 1 of 0".
 */
export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  noun,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Singular; pluralised for the count, e.g. "candidate" → "12 candidates". */
  noun: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <span className="result-count">
        {totalCount.toLocaleString()} {noun}
        {totalCount === 1 ? '' : 's'}
      </span>
      <div className="d-flex align-items-center gap-2">
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="d-none d-sm-inline ms-1">Previous</span>
        </Button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="d-none d-sm-inline me-1">Next</span>
          <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
