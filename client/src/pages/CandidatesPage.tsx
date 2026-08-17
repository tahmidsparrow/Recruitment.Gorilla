import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Form, InputGroup, Table } from 'react-bootstrap';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Trash2, Upload, Users, X } from 'lucide-react';
import {
  deleteCandidate,
  getActiveSkillOptions,
  getCandidateFilterRoleOptions,
  getCandidates,
  getStatusOptions,
} from '../services/api';
import { SearchableMultiSelect } from '../components/SearchableSelect';
import { StatusBadge } from '../components/StatusBadge';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import Page from '../components/ui/Page';
import Pagination from '../components/ui/Pagination';
import { SkeletonRows } from '../components/ui/Loading';
import { useAuth } from '../auth/AuthContext';
import type { CandidateListItem } from '../types';

const PAGE_SIZE = 20;

/** Sortable columns and the direction each one naturally opens in. */
const SORTS = {
  name: { label: 'Name', natural: 'asc' },
  status: { label: 'Status', natural: 'asc' },
  added: { label: 'Added', natural: 'desc' },
} as const;
type SortKey = keyof typeof SORTS;

/**
 * The `<thead>` is hidden below md (see .table-cards), which would take the
 * sortable headers with it. This select is the small-screen equivalent.
 */
/**
 * Human labels for the dashboard buckets (see the API's CandidateBuckets).
 * Arriving from a KPI tile, the list is filtered by something none of the
 * visible controls represent — so the bucket shows as a removable chip, or the
 * filtered result looks like a bug.
 */
const BUCKET_LABELS: Record<string, string> = {
  'in-process': 'In process',
  recommended: 'Recommended',
  rejected: 'Rejected',
  'new-this-week': 'New this week',
};

const MOBILE_SORTS: { value: string; label: string }[] = [
  { value: 'added:desc', label: 'Newest first' },
  { value: 'added:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'status:asc', label: 'Status A–Z' },
];

export default function CandidatesPage() {
  const { canWriteCandidates, isAdminOrAbove } = useAuth();

  // Filters/sort/page live in the URL so views are bookmarkable and survive refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const roleId = searchParams.get('role') ?? '';
  const skillsCsv = searchParams.get('skills') ?? '';
  const referred = searchParams.get('referred') === '1';
  // Set by the dashboard KPI tiles; see BUCKET_LABELS.
  const bucket = searchParams.get('bucket') ?? '';
  const sort = searchParams.get('sort') ?? '';
  const dir = searchParams.get('dir') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const skillIds = skillsCsv ? skillsCsv.split(',').map(Number).filter(Number.isFinite) : [];

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]); // keep in sync on back/forward
  const [toDelete, setToDelete] = useState<CandidateListItem | null>(null);

  /** Set/delete URL params; filter changes reset paging, sort changes don't. */
  const setParams = (patch: Record<string, string | null>, resetPage = true) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const hasFilters = !!(search || status || roleId || skillsCsv || referred || bucket);
  const clearFilters = () => {
    setSearchInput('');
    setParams({ q: null, status: null, role: null, skills: null, referred: null, bucket: null });
  };

  // Default is Added desc. A first click on a column uses its natural direction;
  // clicking the already-active column flips it.
  const activeSort: SortKey = (sort in SORTS ? sort : 'added') as SortKey;
  const activeDir = dir === 'asc' ? 'asc' : dir === 'desc' ? 'desc' : SORTS[activeSort].natural;
  const applySort = (col: SortKey) =>
    activeSort === col
      ? setParams({ sort: col, dir: activeDir === 'asc' ? 'desc' : 'asc' }, false)
      : setParams({ sort: col, dir: SORTS[col].natural }, false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', { search, status, roleId, skillsCsv, referred, bucket, sort, dir, page }],
    queryFn: () =>
      getCandidates({
        search: search || undefined,
        status: status || undefined,
        roleId: roleId ? Number(roleId) : undefined,
        skillIds: skillsCsv || undefined,
        referred: referred || undefined,
        bucket: bucket || undefined,
        sort: sort || undefined,
        dir: dir || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options'],
    queryFn: getStatusOptions,
  });

  // Includes inactive roles, so candidates under a closed opening stay filterable.
  const { data: roleOptions = [] } = useQuery({
    queryKey: ['candidate-filter-roles'],
    queryFn: getCandidateFilterRoleOptions,
  });

  const { data: skillOptions = [] } = useQuery({
    queryKey: ['skill-options', 'active'],
    queryFn: getActiveSkillOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCandidate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setToDelete(null);
    },
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: searchInput.trim() || null });
  };

  /** A sortable column header. A button, so it's reachable by keyboard. */
  const SortHeader = ({ col }: { col: SortKey }) => {
    const active = activeSort === col;
    const Icon = !active ? ChevronsUpDown : activeDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button type="button" className="th-sort" onClick={() => applySort(col)} aria-label={`Sort by ${SORTS[col].label}`}>
        {SORTS[col].label}
        <Icon size={12} strokeWidth={2} aria-hidden="true" className={active ? undefined : 'th-sort__idle'} />
      </button>
    );
  };

  return (
    <Page>
      {/* No <h2> — the topbar owns the page title. The primary action shares
          this row with the filters rather than getting a header row of its
          own; see .page-bar. */}
      <div className="page-bar">
        <search className="flex-grow-1">
          <div className="data-toolbar">
          <Form onSubmit={applySearch} className="data-toolbar__search" role="search">
            <InputGroup>
              <Form.Control
                type="search"
                placeholder="Search by name, email or phone"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search candidates"
              />
              <Button type="submit" variant="outline-secondary" aria-label="Search">
                <Search size={15} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </InputGroup>
          </Form>

          <Form.Select
            aria-label="Filter by status"
            className="data-toolbar__field"
            value={status}
            onChange={(e) => setParams({ status: e.target.value || null })}
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </Form.Select>

          <Form.Select
            aria-label="Filter by role"
            className="data-toolbar__field"
            value={roleId}
            onChange={(e) => setParams({ role: e.target.value || null })}
          >
            <option value="">All roles</option>
            {roleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </Form.Select>

          <div className="data-toolbar__field--wide">
            <SearchableMultiSelect
              options={skillOptions}
              value={skillIds}
              onChange={(ids) => setParams({ skills: ids.join(',') || null })}
              placeholder="Filter by skills…"
            />
          </div>

          <div className="data-toolbar__end">
            {/* Small screens hide the table header, and the sortable columns
                with it — this select is the equivalent control there. */}
            <Form.Select
              className="d-md-none data-toolbar__field"
              aria-label="Sort candidates"
              value={`${activeSort}:${activeDir}`}
              onChange={(e) => {
                const [col, d] = e.target.value.split(':');
                setParams({ sort: col, dir: d }, false);
              }}
            >
              {MOBILE_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Form.Select>

            <Form.Check
              type="checkbox"
              id="filter-referred"
              label="Referred only"
              checked={referred}
              onChange={(e) => setParams({ referred: e.target.checked ? '1' : null })}
            />

            {BUCKET_LABELS[bucket] && (
              <span className="filter-chip">
                {BUCKET_LABELS[bucket]}
                <button
                  type="button"
                  className="filter-chip__remove"
                  aria-label={`Remove the ${BUCKET_LABELS[bucket]} filter`}
                  onClick={() => setParams({ bucket: null })}
                >
                  <X size={13} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </span>
            )}

            {/* Rendered only when something is filtered, so the control appears
                exactly when it can do anything. */}
            {hasFilters && (
              <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            </div>
          </div>
        </search>

        {canWriteCandidates && (
          <div className="page-bar__actions">
            <Link to="/upload" className="btn btn-primary">
              <Upload size={15} strokeWidth={1.75} aria-hidden="true" />
              <span className="ms-1">Upload CVs</span>
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows rows={8} label="Loading candidates" />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Couldn't load candidates"
          description="The request failed. Refresh the page to try again."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Users size={20} strokeWidth={1.75} aria-hidden="true" />}
          title={hasFilters ? 'No candidates match these filters' : 'No candidates yet'}
          description={
            hasFilters
              ? 'Try widening the filters, or clear them to see everyone.'
              : 'Upload some CVs to get started — the details are extracted for you to review.'
          }
          action={
            hasFilters ? (
              <Button variant="outline-secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : canWriteCandidates ? (
              <Link to="/upload" className="btn btn-primary">
                Upload CVs
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* .table-cards reflows each row into a labelled card below md, so no
              column is hidden on small screens — see index.css. */}
          <div className="table-wrap">
            <Table hover className="table-cards align-middle">
              <thead>
                <tr>
                  <th><SortHeader col="name" /></th>
                  <th>Email</th>
                  <th>Title</th>
                  <th><SortHeader col="status" /></th>
                  <th><SortHeader col="added" /></th>
                  {/* Delete is Admin/SuperAdmin-only (the API rejects recruiters). */}
                  {isAdminOrAbove && <th className="col-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Name">
                      <Link to={`/candidates/${c.id}`} className="table-link">
                        {c.fullName}
                      </Link>
                    </td>
                    <td data-label="Email" className="text-break">{c.email}</td>
                    <td data-label="Title">{c.currentTitle ?? '—'}</td>
                    <td data-label="Status">
                      <StatusBadge status={c.currentStatus} />
                    </td>
                    <td data-label="Added" className="text-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    {isAdminOrAbove && (
                      <td className="col-actions">
                        <span className="row-actions">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setToDelete(c)}
                            aria-label={`Delete ${c.fullName}`}
                          >
                            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                            <span className="ms-1">Delete</span>
                          </Button>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            onPageChange={(p) => setParams({ page: p > 1 ? String(p) : null }, false)}
            noun="candidate"
          />
        </>
      )}

      <ConfirmModal
        show={toDelete !== null}
        title="Delete candidate"
        pending={deleteMutation.isPending}
        error={deleteMutation.isError ? 'Delete failed. Please try again.' : undefined}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      >
        Permanently delete <strong>{toDelete?.fullName}</strong>, along with their CV file(s) and
        full status history? This cannot be undone.
      </ConfirmModal>
    </Page>
  );
}
