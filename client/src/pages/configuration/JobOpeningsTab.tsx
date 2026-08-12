import { useMemo, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Trash2 } from 'lucide-react';
import {
  createRoleOption,
  deleteRoleOption,
  getAssignableUsers,
  getRoleOptions,
  updateRoleOption,
} from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ToastStack';
import { SearchableMultiSelect } from '../../components/SearchableSelect';
import PageHeader from '../../components/ui/PageHeader';
import { initials } from '../../utils/initials';
import { JOB_STATUS_BADGE, jobStatus, type JobStatus } from '../../utils/jobStatus';
import type { UpsertOptionPayload } from '../../types';
import type { Opt } from './types';

const PRIORITIES = ['High', 'Medium', 'Low'];
const LOCATIONS = ['Remote', 'Office', 'Hybrid', 'Contractual'];
const DEPARTMENTS = ['Engineering', 'Admin', 'HR'];

/** How many recruiter avatars to show before collapsing the rest into "+N". */
const AVATARS_SHOWN = 3;

const STATUS_FILTERS: { id: 'all' | JobStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closing-soon', label: 'Closing soon' },
  { id: 'closed', label: 'Closed' },
  { id: 'inactive', label: 'Inactive' },
];

/** ISO string → value for <input type="datetime-local"> (local time, no seconds). */
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const jobId = (id: number) => `JOB-${String(id).padStart(3, '0')}`;

const priorityClass = (p?: string | null) => {
  const key = (p ?? '').toLowerCase();
  return key === 'high' || key === 'medium' || key === 'low' ? `priority--${key}` : null;
};

export default function JobOpeningsTab() {
  const { addToast } = useToast();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [editing, setEditing] = useState<Opt | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<Opt | null>(null);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recruiterUserIds, setRecruiterUserIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [endDateInvalid, setEndDateInvalid] = useState(false);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['config', 'roles', 'all'],
    queryFn: () => getRoleOptions(true),
  });

  const { data: users = [] } = useQuery({ queryKey: ['assignable-users'], queryFn: getAssignableUsers });
  // Label carries name + email so the searchable select matches on either.
  const recruiterOptions = users.map((u) => ({ id: u.id, name: `${u.name} (${u.email})` }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['config'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: UpsertOptionPayload = {
        name: name.trim(),
        // Sort order is no longer a field anyone types. New openings go to the
        // end; editing an existing one leaves its position alone.
        sortOrder: editing ? editing.sortOrder : (options.at(-1)?.sortOrder ?? 0) + 1,
        isActive,
        location: location || null,
        department: department || null,
        priority: priority || null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        recruiterUserIds,
      };
      return editing ? updateRoleOption(editing.id, payload) : createRoleOption(payload);
    },
    onSuccess: () => {
      void invalidate();
      addToast(editing ? 'Job opening updated.' : 'Job opening added.');
      setShowModal(false);
    },
    onError: () => setError('Could not save the job opening. The name may already exist.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteRoleOption(id),
    onSuccess: (result) => {
      void invalidate();
      if (result && 'deactivated' in result && result.deactivated) {
        addToast(
          `That role has ${result.candidateCount} assigned candidate(s) — it was deactivated instead of deleted.`,
          'warning',
        );
      } else {
        addToast('Job opening deleted.');
      }
      setDeleting(null);
    },
    onError: () => {
      addToast('Could not delete the job opening.', 'danger');
      setDeleting(null);
    },
  });

  const resetForm = (o: Opt | null) => {
    setEditing(o);
    setName(o?.name ?? '');
    setIsActive(o?.isActive ?? true);
    setLocation(o?.location ?? '');
    setDepartment(o?.department ?? '');
    setPriority(o?.priority ?? '');
    setEndDate(o?.endDate ? toLocalInput(o.endDate) : '');
    setRecruiterUserIds((o?.recruiters ?? []).map((r) => r.userId));
    setError(null);
    setNameInvalid(false);
    setEndDateInvalid(false);
    setShowModal(true);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (statusFilter !== 'all' && jobStatus(o) !== statusFilter) return false;
      if (!q) return true;
      const haystack = [o.name, o.department, o.location, o.priority, ...(o.recruiters ?? []).map((r) => r.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query, statusFilter]);

  return (
    <>
      <PageHeader actions={<Button onClick={() => resetForm(null)}>Add job opening</Button>} />

      <div className="data-toolbar">
        <div className="position-relative flex-grow-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <Search
            size={15}
            strokeWidth={1.75}
            aria-hidden="true"
            className="position-absolute top-50 translate-middle-y"
            style={{ left: 11, color: 'var(--muted)' }}
          />
          <Form.Control
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, recruiter or department…"
            aria-label="Search job openings"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div className="admin-tabs" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              className={statusFilter === f.id ? 'active' : ''}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Spinner animation="border" size="sm" />
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {options.length === 0 ? 'No job openings yet' : 'No openings match these filters'}
          </div>
          <div className="empty-state-description">
            {options.length === 0
              ? 'Add one to make it selectable on candidate forms and visible on the dashboard.'
              : 'Try a different status or clear the search.'}
          </div>
        </div>
      ) : (
        <div className="job-grid">
          {visible.map((o) => (
            <JobCard
              key={o.id}
              job={o}
              canDelete={isSuperAdmin}
              onEdit={() => resetForm(o)}
              onDelete={() => setDeleting(o)}
            />
          ))}
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            let bad = false;
            if (!name.trim()) { setNameInvalid(true); bad = true; }
            if (!endDate) { setEndDateInvalid(true); bad = true; }
            if (bad) { setError(null); return; }
            saveMutation.mutate();
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Edit job opening' : 'Add job opening'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <p className="text-danger small">{error}</p>}

            {/* Title and Posted date used to sit here as readOnly plaintext
                fields, which rendered borderless and read as broken. Both are
                derived and both are shown on the card, so they are gone. */}
            <div className="row g-3">
              <div className="col-12">
                <Form.Label>Role name <span className="required-star" aria-hidden="true">*</span></Form.Label>
                <Form.Control
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (nameInvalid) setNameInvalid(false); }}
                  isInvalid={nameInvalid}
                  autoFocus
                />
                <Form.Control.Feedback type="invalid">Role name is required.</Form.Control.Feedback>
              </div>
              <div className="col-12 col-md-6">
                <Form.Label>Closes <span className="required-star" aria-hidden="true">*</span></Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); if (endDateInvalid) setEndDateInvalid(false); }}
                  isInvalid={endDateInvalid}
                />
                <Form.Control.Feedback type="invalid">A closing date is required.</Form.Control.Feedback>
                {editing?.createdAt && (
                  <Form.Text muted>Posted {formatDate(editing.createdAt)}.</Form.Text>
                )}
              </div>
              <div className="col-12 col-md-6">
                <Form.Label>Priority</Form.Label>
                <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">None</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </div>
              <div className="col-12 col-md-6">
                <Form.Label>Location</Form.Label>
                <Form.Select value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="">None</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Form.Select>
              </div>
              <div className="col-12 col-md-6">
                <Form.Label>Department</Form.Label>
                <Form.Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">None</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </Form.Select>
              </div>
              <div className="col-12">
                <Form.Label>Recruiters</Form.Label>
                <SearchableMultiSelect
                  options={recruiterOptions}
                  value={recruiterUserIds}
                  onChange={setRecruiterUserIds}
                  placeholder="Search by name or email…"
                />
                <Form.Text muted>Each assigned recruiter can access every candidate under this role.</Form.Text>
              </div>
              <div className="col-12">
                <Form.Check
                  type="checkbox"
                  id="job-active"
                  label="Active — shown in candidate forms and on the dashboard"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={deleting !== null} onHide={() => setDeleting(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete job opening</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete <strong>{deleting?.name}</strong>? If any candidates are assigned to this role, it
          will be <strong>deactivated</strong> (kept for history) instead of permanently deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={removeMutation.isPending}
            onClick={() => deleting && removeMutation.mutate(deleting.id)}
          >
            {removeMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function JobCard({
  job,
  canDelete,
  onEdit,
  onDelete,
}: {
  job: Opt;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = jobStatus(job);
  const badge = JOB_STATUS_BADGE[status];
  const recruiters = job.recruiters ?? [];
  const shown = recruiters.slice(0, AVATARS_SHOWN);
  const overflow = recruiters.length - shown.length;
  const prio = priorityClass(job.priority);

  return (
    <article className={`job-card${status === 'closed' || status === 'inactive' ? ' job-card--dim' : ''}`}>
      <div className="job-card__header">
        <span className="cat-chip">{job.department ?? 'Unassigned'}</span>
        <span className={badge.className}>{badge.label}</span>
      </div>

      <div className="job-card__body">
        <div className="job-card__name">{job.name}</div>
        <div className="job-card__sub">
          <span className="job-card__id">{jobId(job.id)}</span>
          <span aria-hidden="true">·</span>
          <span>{job.location ?? 'Location not set'}</span>
          {prio && <span className={`priority-badge ${prio}`}>{job.priority}</span>}
        </div>
      </div>

      <div className="job-card__footer">
        <div>
          <span className="job-card__meta-label">Recruiters</span>
          {recruiters.length === 0 ? (
            <span className="table-muted">Unassigned</span>
          ) : (
            <span className="avatar-stack" title={recruiters.map((r) => r.name).join(', ')}>
              {shown.map((r) => (
                <span key={r.userId} className="avatar avatar--sm" aria-hidden="true">
                  {initials(r.name) || '?'}
                </span>
              ))}
              {overflow > 0 && (
                <span className="avatar avatar--sm avatar--more" aria-hidden="true">+{overflow}</span>
              )}
              <span className="visually-hidden">{recruiters.map((r) => r.name).join(', ')}</span>
            </span>
          )}
        </div>

        <div>
          <span className="job-card__meta-label">{status === 'closed' ? 'Closed' : 'Closes'}</span>
          <span className="job-card__meta-value">{formatDate(job.endDate)}</span>
        </div>

        <div className="job-card__actions">
          <Button size="sm" variant="outline-secondary" onClick={onEdit} title="Edit" aria-label={`Edit ${job.name}`}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          {canDelete && (
            <Button size="sm" variant="outline-danger" onClick={onDelete} title="Delete" aria-label={`Delete ${job.name}`}>
              <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
