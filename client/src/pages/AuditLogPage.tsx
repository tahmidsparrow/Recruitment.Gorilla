import { useState } from 'react';
import { Badge, Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAuditLog } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
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

  return (
    <div>
      {/* No <h2> — the topbar owns the page title. */}
      <div className="pulse-card">
        <Form onSubmit={applyFilters}>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={6} lg={3}>
              <Form.Label>Entity type</Form.Label>
              <Form.Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                <option value="">All</option>
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label>Action contains</Form.Label>
              <Form.Control value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Deleted, Auth" />
            </Col>
            <Col xs={12} sm={6} lg={2}>
              <Form.Label>From</Form.Label>
              <Form.Control type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Col>
            <Col xs={12} sm={6} lg={2}>
              <Form.Label>To</Form.Label>
              <Form.Control type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Col>
            <Col xs={12} lg={2} className="d-flex gap-2">
              <Button type="submit" className="flex-grow-1">Filter</Button>
              <Button type="button" variant="outline-secondary" onClick={reset}>Reset</Button>
            </Col>
          </Row>
        </Form>
      </div>

      {isLoading ? (
        <Spinner animation="border" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load the audit trail"
          description="The request failed. Refresh to try again."
        />
      ) : data!.items.length === 0 ? (
        <EmptyState
          title="No audit events match"
          description="Widen the date range or clear the filters."
        />
      ) : (
        <>
          <span className="result-count">
            {total.toLocaleString()} event{total === 1 ? '' : 's'}
            {isFetching ? ' · updating…' : ''}
          </span>

          <div className="table-wrap">
            <Table hover size="sm" className="table-cards align-middle">
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
                {data!.items.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Time" className="text-nowrap">{fmt(e.timestamp)}</td>
                    <td data-label="Actor">{e.actorName}</td>
                    <td data-label="Action"><Badge bg={actionVariant(e.action)}>{e.action}</Badge></td>
                    <td data-label="Entity" className="text-nowrap">
                      {e.entityType ? `${e.entityType}${e.entityId != null ? ` #${e.entityId}` : ''}` : '—'}
                    </td>
                    <td data-label="Summary">{e.summary ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={total}
            onPageChange={setPage}
            noun="event"
          />
        </>
      )}
    </div>
  );
}
