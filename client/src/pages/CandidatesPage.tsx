import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, InputGroup, Spinner, Table } from 'react-bootstrap';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { deleteCandidate, getCandidates, getStatusOptions } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { useAuth } from '../auth/AuthContext';
import type { CandidateListItem } from '../types';

const PAGE_SIZE = 20;

export default function CandidatesPage() {
  const { canWriteCandidates, isAdminOrAbove } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<CandidateListItem | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', { search, status, page }],
    queryFn: () => getCandidates({ search, status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options'],
    queryFn: getStatusOptions,
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
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div>
      {/* No <h2> — the topbar owns the page title. */}
      <PageHeader
        actions={
          canWriteCandidates && (
            <Link to="/upload" className="btn btn-primary">
              Upload CVs
            </Link>
          )
        }
      />

      <div className="data-toolbar">
        <Form onSubmit={applySearch} className="flex-grow-1" style={{ minWidth: 200, maxWidth: 420 }}>
          <InputGroup>
            <Form.Control
              type="search"
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search candidates"
            />
            <Button type="submit" variant="outline-secondary">
              Search
            </Button>
          </InputGroup>
        </Form>
        <Form.Select
          aria-label="Filter by status"
          style={{ minWidth: 160, maxWidth: 220 }}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </Form.Select>
      </div>

      {isLoading ? (
        <Spinner animation="border" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load candidates"
          description="The request failed. Refresh to try again."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={search || status ? 'No candidates match these filters' : 'No candidates yet'}
          description={
            search || status
              ? 'Try a different status or clear the search.'
              : 'Upload some CVs to get started.'
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Added</th>
                  {/* Delete is Admin/SuperAdmin-only (the API rejects recruiters). */}
                  {isAdminOrAbove && <th className="col-right">Actions</th>}
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
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => setToDelete(c)}
                          aria-label={`Delete ${c.fullName}`}
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span className="ms-1">Delete</span>
                        </Button>
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
            onPageChange={setPage}
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
    </div>
  );
}
