import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Prev/next pager with a result count. Replaces the copy of this markup that
 * lived in CandidatesPage, AuditLogPage and UsersPage.
 *
 * `totalPages` is derived here rather than passed in, so every caller rounds
 * the same way and a zero-result page still reads "Page 1 of 1" instead of
 * "Page 1 of 0".
 *
 * The labels collapse to bare chevrons below `sm`. The buttons keep their full
 * control height either way, so a thumb still has a real target — shrinking
 * the control along with the label is the usual mistake here.
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[length:var(--text-sm)] whitespace-nowrap text-muted-foreground">
        {totalCount.toLocaleString()} {noun}
        {totalCount === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft strokeWidth={2} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="px-1 text-[length:var(--text-sm)] whitespace-nowrap text-muted-foreground tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight strokeWidth={2} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
