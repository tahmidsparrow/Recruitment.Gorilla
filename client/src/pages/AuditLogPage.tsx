import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAuditLog } from '../services/api';
import type { AuditQuery } from '../types';

const ENTITY_TYPES = ['Candidate', 'Interview', 'Role', 'Skill', 'InterviewType', 'User'];
const PAGE_SIZE = 50;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Color the action badge by its top-level area (matches nothing security-sensitive; purely visual). */
const actionVariant = (action: string) => {
  if (action.startsWith('Auth')) return action.includes('Failed') ? 'danger' : 'secondary';
  if (action.endsWith('.Deleted')) return 'warning';
  if (action.endsWith('.Created')) return 'success';
  return 'info';
};

export default function AuditLogPage() {
  // Draft filters (edited in the bar) vs applied filters (fed to the query).
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState<AuditQuery>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['audit', applied, page],
    queryFn: () => getAuditLog({ ...applied, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied({
      entityType: entityType || undefined,
      action: action.trim() || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    });
  };

  const reset = () => {
    setEntityType(''); setAction(''); setFrom(''); setTo('');
    setApplied({}); setPage(1);
  };

  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h2 className="mb-4">Audit trail</h2>

      <Card className="mb-3">
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row className="g-2 align-items-end">
              <Col md={3}>
                <Form.Label className="mb-1 small text-muted">Entity type</Form.Label>
                <Form.Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                  <option value="">All</option>
                  {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="mb-1 small text-muted">Action contains</Form.Label>
                <Form.Control value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Deleted, Auth" />
              </Col>
              <Col md={2}>
                <Form.Label className="mb-1 small text-muted">From</Form.Label>
                <Form.Control type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Col>
              <Col md={2}>
                <Form.Label className="mb-1 small text-muted">To</Form.Label>
                <Form.Control type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
              </Col>
              <Col md={2} className="d-flex gap-2">
                <Button type="submit" className="flex-grow-1">Filter</Button>
                <Button type="button" variant="outline-secondary" onClick={reset}>Reset</Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {isLoading ? (
        <Spinner animation="border" />
      ) : isError ? (
        <p className="text-danger">Failed to load the audit trail.</p>
      ) : (
        <Card>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small">{total} event(s){isFetching ? ' · updating…' : ''}</span>
            </div>
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-muted text-center py-3">No audit events match.</td></tr>
                  ) : (
                    data!.items.map((e) => (
                      <tr key={e.id}>
                        <td className="text-nowrap small">{fmt(e.timestamp)}</td>
                        <td className="small">{e.actorName}</td>
                        <td><Badge bg={actionVariant(e.action)}>{e.action}</Badge></td>
                        <td className="small text-nowrap">{e.entityType ? `${e.entityType}${e.entityId != null ? ` #${e.entityId}` : ''}` : '—'}</td>
                        <td className="small">{e.summary ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Previous
                </Button>
                <span className="text-muted small">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next →
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
