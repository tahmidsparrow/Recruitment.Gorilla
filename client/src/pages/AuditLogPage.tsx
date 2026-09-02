import { useState, useMemo } from 'react';
import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { getAuditLog } from '../services/api';
import SearchableDropdown, { type DropdownOption } from '../components/SearchableSelect';
import EmptyState from '../components/common/EmptyState';
import Page from '../components/common/Page';
import Pagination from '../components/common/Pagination';
import { SkeletonRows } from '../components/common/Loading';
import type { AuditQuery } from '../types';

const ENTITY_TYPES = ['Candidate', 'Interview', 'Role', 'Skill', 'InterviewType', 'User'];
const PAGE_SIZE = 50;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Colour the action pill by its top-level area. Purely visual — nothing
 * security-sensitive keys off it. Pills rather than raw Bootstrap badges so
 * they match every other badge in the app and carry a glyph, since the colour
 * is the only thing distinguishing a create from a delete at a glance.
 */
const actionBadge = (action: string): string => {
  if (action.startsWith('Auth')) {
    return action.includes('Failed') ? 'badge-pill badge-danger' : 'badge-pill badge-neutral';
  }
  if (action.endsWith('.Deleted')) return 'badge-pill badge-warning';
  if (action.endsWith('.Created')) return 'badge-pill badge-success';
  return 'badge-pill badge-info';
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

  const hasFilters = Object.values(applied).some(Boolean);

  const entityOptions: DropdownOption<string>[] = useMemo(
    () => ENTITY_TYPES.map((t) => ({ id: t, name: t })),
    []
  );

  return (
    <Page>
      {/* No <h2> — the topbar owns the page title. */}
      {/* No heading: the fields are self-describing and the topbar already says
          "Audit". A title and a caption over four labelled inputs was just
          height. */}
      <div className="pulse-card">
        <Form onSubmit={applyFilters}>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={6} lg={3}>
              <Form.Label htmlFor="audit-entity">Entity type</Form.Label>
              <SearchableDropdown<string>
                id="audit-entity"
                options={entityOptions}
                value={entityType || null}
                onChange={(val) => setEntityType(val || '')}
                placeholder="All entity types"
                emptyMessage="No entity type found"
                clearable
              />
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label htmlFor="audit-action">Action contains</Form.Label>
              <Form.Control id="audit-action" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Deleted, Auth" />
            </Col>
            <Col xs={12} sm={6} lg={2}>
              <Form.Label htmlFor="audit-from">From</Form.Label>
              <Form.Control id="audit-from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Col>
            <Col xs={12} sm={6} lg={2}>
              <Form.Label htmlFor="audit-to">To</Form.Label>
              <Form.Control id="audit-to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Col>
            <Col xs={12} lg={2} className="d-flex gap-2">
              <Button type="submit" className="flex-grow-1">Filter</Button>
              <Button type="button" variant="outline-secondary" onClick={reset}>Reset</Button>
            </Col>
          </Row>
        </Form>
      </div>

      {isLoading ? (
        <SkeletonRows rows={10} label="Loading audit events" />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Couldn't load the audit trail"
          description="The request failed. Refresh the page to try again."
        />
      ) : data!.items.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={20} strokeWidth={1.75} aria-hidden="true" />}
          title="No audit events match"
          description={
            hasFilters
              ? 'Widen the date range, or reset the filters to see everything.'
              : 'Actions taken in the portal will be recorded here.'
          }
          action={
            hasFilters ? (
              <Button variant="outline-secondary" onClick={reset}>
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Only the in-flight state is shown here — the total already appears
              in the pager below, and printing it twice on one screen just made
              the reader check whether the two numbers agreed. */}
          {isFetching && (
            <span className="result-count" aria-live="polite">
              Updating…
            </span>
          )}

          <div className="table-wrap">
            <Table hover className="table-cards align-middle">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Time" className="text-nowrap table-muted">{fmt(e.timestamp)}</td>
                    <td data-label="Actor" className="fw-semibold">{e.actorName}</td>
                    <td data-label="Action">
                      <span className={actionBadge(e.action)}>{e.action}</span>
                    </td>
                    <td data-label="Entity" className="text-nowrap col-mono">
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
    </Page>
  );
}
