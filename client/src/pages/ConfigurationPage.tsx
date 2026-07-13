import { useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoleOption,
  createSkillOption,
  createInterviewTypeOption,
  deleteRoleOption,
  deleteSkillOption,
  deleteInterviewTypeOption,
  getAssignableUsers,
  getRoleOptions,
  getSkillOptions,
  getInterviewTypeOptions,
  updateRoleOption,
  updateSkillOption,
  updateInterviewTypeOption,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastStack';
import { SearchableMultiSelect } from '../components/SearchableSelect';
import type { DeleteRoleResult, UpsertOptionPayload } from '../types';

interface Opt {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  location?: string | null;
  department?: string | null;
  priority?: string | null;
  createdAt?: string;
  endDate?: string;
  title?: string;
  recruiters?: { userId: number; name: string }[];
}

const PRIORITIES = ['High', 'Medium', 'Low'];
const LOCATIONS = ['Remote', 'Office', 'Hybrid', 'Contractual'];
const DEPARTMENTS = ['Engineering', 'Admin', 'HR'];

/** ISO string → value for <input type="datetime-local"> (local time, no seconds). */
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const isClosed = (iso?: string) => !!iso && new Date(iso).getTime() < Date.now();

interface SectionApi {
  list: (includeInactive: boolean) => Promise<Opt[]>;
  create: (p: UpsertOptionPayload) => Promise<Opt>;
  update: (id: number, p: UpsertOptionPayload) => Promise<Opt>;
  remove: (id: number) => Promise<DeleteRoleResult | void>;
}

const rolesApi: SectionApi = {
  list: getRoleOptions,
  create: createRoleOption,
  update: updateRoleOption,
  remove: deleteRoleOption,
};

const skillsApi: SectionApi = {
  list: getSkillOptions,
  create: createSkillOption,
  update: updateSkillOption,
  remove: deleteSkillOption,
};

const interviewTypesApi: SectionApi = {
  list: getInterviewTypeOptions,
  create: createInterviewTypeOption,
  update: updateInterviewTypeOption,
  remove: deleteInterviewTypeOption,
};

export default function ConfigurationPage() {
  return (
    <div>
      <h2 className="mb-4">Configuration</h2>
      <OptionSection title="Roles applied / Job openings" noun="role" queryKey="roles" api={rolesApi} jobFields />
      <OptionSection title="Skills" noun="skill" queryKey="skills" api={skillsApi} />
      <OptionSection title="Interview Types" noun="interview type" queryKey="interview-types" api={interviewTypesApi} />
    </div>
  );
}

function OptionSection({
  title,
  noun,
  queryKey,
  api,
  jobFields = false,
}: {
  title: string;
  noun: string;
  queryKey: string;
  api: SectionApi;
  jobFields?: boolean;
}) {
  const { addToast } = useToast();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Opt | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<Opt | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
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
    queryKey: ['config', queryKey, 'all'],
    queryFn: () => api.list(true),
  });

  // Active users for the recruiter picker (roles only). Label combines name + email so the
  // searchable select matches on either.
  const { data: users = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: getAssignableUsers,
    enabled: jobFields,
  });
  const recruiterOptions = users.map((u) => ({ id: u.id, name: `${u.name} (${u.email})` }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['config'] });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: UpsertOptionPayload = { name: name.trim(), sortOrder, isActive };
      if (jobFields) {
        payload.location = location || null;
        payload.department = department || null;
        payload.priority = priority || null;
        payload.endDate = endDate ? new Date(endDate).toISOString() : null;
        payload.recruiterUserIds = recruiterUserIds;
      }
      return editing ? api.update(editing.id, payload) : api.create(payload);
    },
    onSuccess: () => {
      void invalidate();
      addToast(editing ? `${cap(noun)} updated.` : `${cap(noun)} added.`);
      setShowModal(false);
    },
    onError: () => setError(`Could not save ${noun}. The name may already exist.`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: (result) => {
      void invalidate();
      if (result && 'deactivated' in result && result.deactivated) {
        addToast(`${cap(noun)} has ${result.candidateCount} assigned candidate(s) — it was deactivated instead of deleted.`, 'warning');
      } else {
        addToast(`${cap(noun)} deleted.`);
      }
      setDeleting(null);
    },
    onError: () => {
      addToast(`Could not delete ${noun}.`, 'danger');
      setDeleting(null);
    },
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSortOrder((options.at(-1)?.sortOrder ?? 0) + 1);
    setIsActive(true);
    setLocation('');
    setDepartment('');
    setPriority('');
    setEndDate('');
    setRecruiterUserIds([]);
    setError(null);
    setNameInvalid(false);
    setEndDateInvalid(false);
    setShowModal(true);
  };

  const openEdit = (o: Opt) => {
    setEditing(o);
    setName(o.name);
    setSortOrder(o.sortOrder);
    setIsActive(o.isActive);
    setLocation(o.location ?? '');
    setDepartment(o.department ?? '');
    setPriority(o.priority ?? '');
    setEndDate(o.endDate ? toLocalInput(o.endDate) : '');
    setRecruiterUserIds((o.recruiters ?? []).map((r) => r.userId));
    setError(null);
    setNameInvalid(false);
    setEndDateInvalid(false);
    setShowModal(true);
  };

  // Live preview of the auto-generated title.
  const titlePreview = name.trim()
    ? `${name.trim()} — ${formatDate(editing?.createdAt ?? new Date().toISOString())}`
    : '—';

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>{title}</span>
        <Button size="sm" onClick={openAdd}>
          Add {noun}
        </Button>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <Spinner animation="border" size="sm" />
        ) : options.length === 0 ? (
          <p className="text-muted mb-0">No {noun} values yet.</p>
        ) : (
          <Table hover responsive className="align-middle mb-0">
            <thead>
              <tr>
                <th>{jobFields ? 'Role Name' : 'Name'}</th>
                {jobFields && <th className="d-none d-lg-table-cell">Title</th>}
                {jobFields && <th className="d-none d-md-table-cell">Location</th>}
                {jobFields && <th className="d-none d-md-table-cell">Department</th>}
                {jobFields && <th className="d-none d-lg-table-cell">Recruiter</th>}
                {jobFields && <th className="d-none d-lg-table-cell">Posted</th>}
                {jobFields && <th>End date</th>}
                <th style={{ width: 80 }}>Order</th>
                <th style={{ width: 100 }}>Status</th>
                <th className="text-end" style={{ width: 170 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  {jobFields && <td className="d-none d-lg-table-cell text-muted small">{o.title ?? '—'}</td>}
                  {jobFields && <td className="d-none d-md-table-cell">{o.location ?? '—'}</td>}
                  {jobFields && <td className="d-none d-md-table-cell">{o.department ?? '—'}</td>}
                  {jobFields && <td className="d-none d-lg-table-cell">{o.recruiters && o.recruiters.length > 0 ? o.recruiters.map((r) => r.name).join(', ') : '—'}</td>}
                  {jobFields && <td className="d-none d-lg-table-cell">{formatDate(o.createdAt)}</td>}
                  {jobFields && (
                    <td>
                      {isClosed(o.endDate) ? (
                        <span className="text-danger fw-semibold">{formatDateTime(o.endDate)} · Closed</span>
                      ) : (
                        formatDateTime(o.endDate)
                      )}
                    </td>
                  )}
                  <td>{o.sortOrder}</td>
                  <td>
                    <Badge bg={o.isActive ? 'success' : 'secondary'}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    {/* Roles: only a Super Admin may delete. Skills: unchanged (Admin+). */}
                    {(!jobFields || isSuperAdmin) && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={removeMutation.isPending}
                        onClick={() => (jobFields ? setDeleting(o) : removeMutation.mutate(o.id))}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            let bad = false;
            if (!name.trim()) { setNameInvalid(true); bad = true; }
            if (jobFields && !endDate) { setEndDateInvalid(true); bad = true; }
            if (bad) { setError(null); return; }
            setNameInvalid(false);
            setEndDateInvalid(false);
            saveMutation.mutate();
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{editing ? `Edit ${noun}` : `Add ${noun}`}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <p className="text-danger small">{error}</p>}
            <Form.Group className="mb-3">
              <Form.Label>{jobFields ? 'Role Name' : 'Name'} <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameInvalid) setNameInvalid(false); }}
                isInvalid={nameInvalid}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
            </Form.Group>

            {jobFields && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Title <span className="text-muted small">(auto)</span></Form.Label>
                  <Form.Control value={titlePreview} readOnly plaintext className="text-muted" />
                </Form.Group>
                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <Form.Label>Posted date <span className="text-muted small">(read-only)</span></Form.Label>
                    <Form.Control value={editing ? formatDate(editing.createdAt) : 'Set on creation'} readOnly plaintext className="text-muted" />
                  </div>
                  <div className="col-sm-6">
                    <Form.Label>End date &amp; time <span className="required-star" aria-hidden="true">*</span></Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); if (endDateInvalid) setEndDateInvalid(false); }}
                      isInvalid={endDateInvalid}
                    />
                    <Form.Control.Feedback type="invalid">End date is required.</Form.Control.Feedback>
                  </div>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <Form.Label>Location</Form.Label>
                    <Form.Select value={location} onChange={(e) => setLocation(e.target.value)}>
                      <option value="">None</option>
                      {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </Form.Select>
                  </div>
                  <div className="col-sm-6">
                    <Form.Label>Department</Form.Label>
                    <Form.Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                      <option value="">None</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </Form.Select>
                  </div>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="">None</option>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Form.Select>
                  </div>
                  <div className="col-sm-6">
                    <Form.Label>Recruiters</Form.Label>
                    <SearchableMultiSelect
                      options={recruiterOptions}
                      value={recruiterUserIds}
                      onChange={setRecruiterUserIds}
                      placeholder="Search by name or email…"
                    />
                    <Form.Text muted>Each assigned recruiter can access all candidates under this role.</Form.Text>
                  </div>
                </div>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Sort order</Form.Label>
              <Form.Control
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              id={`${queryKey}-active`}
              label={jobFields ? 'Active (open — shown in candidate forms & job openings)' : 'Active (shown in candidate forms)'}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Role delete confirmation (Super Admin only) */}
      <Modal show={deleting !== null} onHide={() => setDeleting(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete role</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete <strong>{deleting?.name}</strong>? If any candidates are assigned to this role, it
          will be <strong>deactivated</strong> (kept for history) instead of permanently deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={removeMutation.isPending}
            onClick={() => deleting && removeMutation.mutate(deleting.id)}
          >
            {removeMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
