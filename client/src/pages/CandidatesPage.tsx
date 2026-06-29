import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCandidate, getCandidates } from '../services/api';
import type { CandidateListItem } from '../types';

const PAGE_SIZE = 20;

export default function CandidatesPage() {
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

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Candidates</h2>
        <Link to="/upload" className="btn btn-primary">
          Upload CVs
        </Link>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Form onSubmit={applySearch} className="flex-grow-1" style={{ maxWidth: 420 }}>
          <InputGroup>
            <Form.Control
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline-secondary">
              Search
            </Button>
          </InputGroup>
        </Form>
        <Form.Control
          placeholder="Filter by status"
          style={{ maxWidth: 220 }}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        />
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
                <th>Name</th>
                <th>Email</th>
                <th>Title</th>
                <th>Status</th>
                <th>Added</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/candidates/${c.id}`}>{c.fullName}</Link>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.currentTitle ?? '—'}</td>
                  <td>
                    <Badge bg="info" text="dark">
                      {c.currentStatus}
                    </Badge>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setToDelete(c)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">{data.totalCount} candidate(s)</span>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
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
