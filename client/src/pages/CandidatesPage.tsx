import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteCandidate,
  getActiveSkillOptions,
  getCandidateFilterRoleOptions,
  getCandidates,
  getStatusOptions,
} from '../services/api';
import { SearchableMultiSelect } from '../components/SearchableSelect';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import type { CandidateListItem } from '../types';

const PAGE_SIZE = 20;

export default function CandidatesPage() {
  const { canWriteCandidates, isAdminOrAbove } = useAuth();
  // Filters/sort/page live in the URL so views are bookmarkable and survive refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const roleId = searchParams.get('role') ?? '';
  const skillsCsv = searchParams.get('skills') ?? '';
  const referred = searchParams.get('referred') === '1';
  const sort = searchParams.get('sort') ?? '';
  const dir = searchParams.get('dir') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const skillIds = skillsCsv
    ? skillsCsv.split(',').map(Number).filter(Number.isFinite)
    : [];

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]); // keep in sync on back/forward
  const [toDelete, setToDelete] = useState<CandidateListItem | null>(null);

  /** Set/delete URL params; filter changes reset paging. */
  const setParams = (patch: Record<string, string | null>, resetPage = true) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (resetPage) next.delete('page');
      return next;
    }, { replace: true });

  const hasFilters = !!(search || status || roleId || skillsCsv || referred);
  const clearFilters = () => {
    setSearchInput('');
    setParams({ q: null, status: null, role: null, skills: null, referred: null });
  };

  // Sorting: default is Added (CreatedAt) desc; first click on a column uses its natural
  // direction (name/status asc, added desc); clicking the active column flips it.
  const activeSort = sort || 'added';
  const applySort = (col: string) =>
    activeSort === col
      ? setParams({ sort: col, dir: dir !== 'asc' ? 'asc' : 'desc' }, false)
      : setParams({ sort: col, dir: col === 'added' ? 'desc' : 'asc' }, false);
  const sortIndicator = (col: string) =>
    activeSort === col ? (dir === 'asc' ? ' ▲' : ' ▼') : '';

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', { search, status, roleId, skillsCsv, referred, sort, dir, page }],
    queryFn: () => getCandidates({
      search: search || undefined,
      status: status || undefined,
      roleId: roleId ? Number(roleId) : undefined,
      skillIds: skillsCsv || undefined,
      referred: referred || undefined,
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

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Candidates</h2>
        {canWriteCandidates && (
          <Link to="/upload" className="btn btn-primary">
            Upload CVs
          </Link>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-start">
        <Form onSubmit={applySearch} className="flex-grow-1" style={{ maxWidth: 420 }}>
          <InputGroup>
            <Form.Control
              placeholder="Search by name, email or phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline-secondary">
              Search
            </Button>
          </InputGroup>
        </Form>
        <Form.Select
          aria-label="Filter by status"
          style={{ maxWidth: 220 }}
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
          style={{ maxWidth: 240 }}
          value={roleId}
          onChange={(e) => setParams({ role: e.target.value || null })}
        >
          <option value="">All roles</option>
          {roleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}{option.isActive ? '' : ' (inactive)'}
            </option>
          ))}
        </Form.Select>
        <div style={{ minWidth: 220, maxWidth: 320 }}>
          <SearchableMultiSelect
            options={skillOptions}
            value={skillIds}
            onChange={(ids) => setParams({ skills: ids.join(',') || null })}
            placeholder="Filter by skills…"
          />
        </div>
        <Form.Check
          type="checkbox"
          id="filter-referred"
          className="align-self-center"
          label="Referred only"
          checked={referred}
          onChange={(e) => setParams({ referred: e.target.checked ? '1' : null })}
        />
        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            className="align-self-center text-decoration-none"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <Spinner animation="border" />
      ) : isError ? (
        <p className="text-danger">Failed to load candidates.</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted">No candidates found.</p>
      ) : (
        <>
          <Table hover responsive className="align-middle">
            <thead>
              <tr>
                <th role="button" style={{ cursor: 'pointer' }} onClick={() => applySort('name')}>
                  Name{sortIndicator('name')}
                </th>
                <th className="d-none d-lg-table-cell">Email</th>
                <th className="d-none d-md-table-cell">Title</th>
                <th role="button" style={{ cursor: 'pointer' }} onClick={() => applySort('status')}>
                  Status{sortIndicator('status')}
                </th>
                <th
                  className="d-none d-md-table-cell"
                  role="button"
                  style={{ cursor: 'pointer' }}
                  onClick={() => applySort('added')}
                >
                  Added{sortIndicator('added')}
                </th>
                {/* Delete is Admin/SuperAdmin-only (the API rejects recruiters) — hide it below Admin. */}
                {isAdminOrAbove && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/candidates/${c.id}`}>{c.fullName}</Link>
                    {/* Email is hidden as its own column on small screens — show it here instead */}
                    <div className="text-muted small d-lg-none text-break">{c.email}</div>
                  </td>
                  <td className="d-none d-lg-table-cell text-break">{c.email}</td>
                  <td className="d-none d-md-table-cell">{c.currentTitle ?? '—'}</td>
                  <td>
                    <StatusBadge status={c.currentStatus} />
                  </td>
                  <td className="d-none d-md-table-cell text-nowrap">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  {isAdminOrAbove && (
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => setToDelete(c)}
                      >
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
            <span className="text-muted small">{data.totalCount} candidate(s)</span>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) }, false)}
              >
                Previous
              </Button>
              <span className="small">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setParams({ page: String(page + 1) }, false)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal show={toDelete !== null} onHide={() => setToDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Permanently delete <strong>{toDelete?.fullName}</strong>, along with their CV file(s)
          and full status history? This cannot be undone.
          {deleteMutation.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              Delete failed. Please try again.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
