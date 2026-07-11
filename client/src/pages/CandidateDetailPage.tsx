import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStatus,
  deleteCandidate,
  downloadCvFile,
  getAssignableUsers,
  getCandidate,
  getNextStatusOptions,
  getRoleOptions,
  getSkillOptions,
  previewCvFile,
  updateCandidate,
} from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import { SearchableSelect, SearchableMultiSelect } from '../components/SearchableSelect';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastStack';
import { useAuth } from '../auth/AuthContext';
import type { CVFileInfo, CandidateDetail } from '../types';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
const EMAIL_REGEX = /^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i;

function Req() {
  return <span className="required-star" aria-hidden="true">*</span>;
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const candidateId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canWriteCandidates } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => getCandidate(candidateId),
    enabled: Number.isFinite(candidateId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCandidate(candidateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      navigate('/candidates');
    },
  });

  if (isLoading) return <Spinner animation="border" />;
  if (isError || !data) return <p className="text-danger">Failed to load candidate.</p>;

  return (
    <div>
      <Link to="/candidates" className="small">
        ← Back to candidates
      </Link>
      <div className="d-flex justify-content-between align-items-center my-3">
        <div className="d-flex align-items-center gap-3">
          <h2 className="mb-0">{data.fullName}</h2>
          <StatusBadge status={data.currentStatus} />
        </div>
        {canWriteCandidates && (
          <Button variant="outline-danger" onClick={() => setConfirmDelete(true)}>
            Delete candidate
          </Button>
        )}
      </div>

      {data.roleClosed && (
        <Alert variant="warning">
          <strong>Job opening closed.</strong> This candidate's applied-for role ended
          {data.roleEndDate ? ` on ${new Date(data.roleEndDate).toLocaleString()}` : ''}. Profile
          edits and status changes are locked until an Admin extends the role's End Date in
          Configuration.
        </Alert>
      )}

      <Modal show={confirmDelete} onHide={() => setConfirmDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Permanently delete <strong>{data.fullName}</strong>, along with their CV file(s) and
          full status history? This cannot be undone.
          {deleteMutation.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              Delete failed. Please try again.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header>Profile</Card.Header>
            <Card.Body>
              <ProfileEditor
                candidate={data}
                canWrite={canWriteCandidates && !data.roleClosed}
                onSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
                  void queryClient.invalidateQueries({ queryKey: ['candidates'] });
                }}
              />
            </Card.Body>
          </Card>

          <CvFilesCard candidateId={candidateId} files={data.cvFiles} />
        </Col>

        <Col lg={5}>
          <Card>
            <Card.Header>Status history</Card.Header>
            <Card.Body>
              {canWriteCandidates && !data.roleClosed && (
                <>
                  <AddStatus
                    candidateId={candidateId}
                    onAdded={() =>
                      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
                    }
                  />
                  <hr />
                </>
              )}
              <StatusTimeline history={data.statusHistory} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

type ProfileFieldErrors = Partial<Record<'fullName' | 'email' | 'roleApplied' | 'relevantExperience' | 'referenceName' | 'referenceEmail', string>>;

function ProfileEditor({
  candidate,
  canWrite,
  onSaved,
}: {
  candidate: CandidateDetail;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState(candidate);
  const [skillIds, setSkillIds] = useState<number[]>(candidate.skillOptions.map((s) => s.id));
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  useEffect(() => {
    setForm(candidate);
    setSkillIds(candidate.skillOptions.map((s) => s.id));
  }, [candidate]);

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['config', 'roles'],
    queryFn: () => getRoleOptions(),
  });
  const { data: skillOptions = [] } = useQuery({
    queryKey: ['config', 'skills'],
    queryFn: () => getSkillOptions(),
  });

  const set = (field: keyof CandidateDetail, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const clearFE = (field: keyof ProfileFieldErrors) =>
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));

  const mutation = useMutation({
    mutationFn: () =>
      updateCandidate(candidate.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || null,
        currentTitle: form.currentTitle || null,
        relevantExperience: form.relevantExperience.trim(),
        skills: form.skills || null,
        summary: form.summary || null,
        linkedInUrl: form.linkedInUrl || null,
        githubUrl: form.githubUrl || null,
        portfolioUrl: form.portfolioUrl || null,
        appliedRole: null,
        roleAppliedOptionId: form.roleAppliedOptionId,
        skillOptionIds: skillIds,
        isReferred: form.isReferred,
        referenceName: form.isReferred ? form.referenceName || null : null,
        referenceEmail: form.isReferred ? form.referenceEmail || null : null,
        referenceEmployeeId: form.isReferred ? form.referenceEmployeeId || null : null,
      }),
    onSuccess: () => {
      addToast('Profile saved successfully.');
      onSaved();
    },
    onError: () => addToast('Save failed. Please try again.', 'danger'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: ProfileFieldErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'A valid email address is required.';
    if (!form.relevantExperience?.trim()) errs.relevantExperience = 'Relevant experience is required.';
    if (!form.roleAppliedOptionId) errs.roleApplied = 'Role applied for is required.';
    if (form.isReferred && !form.referenceName?.trim())
      errs.referenceName = 'Reference name is required.';
    if (form.isReferred && !EMAIL_REGEX.test((form.referenceEmail ?? '').trim()))
      errs.referenceEmail = 'A valid reference email is required.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    mutation.mutate();
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!canWrite} className="border-0 p-0 m-0">
      <Row className="g-3">
        <Col md={6}>
          <Form.Label>Full name <Req /></Form.Label>
          <Form.Control
            value={form.fullName}
            onChange={(e) => { set('fullName', e.target.value); clearFE('fullName'); }}
            isInvalid={!!fieldErrors.fullName}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>Email <Req /></Form.Label>
          <Form.Control
            value={form.email}
            onChange={(e) => { set('email', e.target.value); clearFE('email'); }}
            isInvalid={!!fieldErrors.email}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>Phone</Form.Label>
          <Form.Control value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Current title</Form.Label>
          <Form.Control
            value={form.currentTitle ?? ''}
            onChange={(e) => set('currentTitle', e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Label>Relevant Experience <Req /></Form.Label>
          <Form.Control
            value={form.relevantExperience ?? ''}
            placeholder="e.g. 3 Years"
            onChange={(e) => { set('relevantExperience', e.target.value); clearFE('relevantExperience'); }}
            isInvalid={!!fieldErrors.relevantExperience}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.relevantExperience}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>LinkedIn URL</Form.Label>
          <Form.Control
            value={form.linkedInUrl ?? ''}
            onChange={(e) => set('linkedInUrl', e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Label>GitHub URL</Form.Label>
          <Form.Control
            value={form.githubUrl ?? ''}
            onChange={(e) => set('githubUrl', e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Label>Portfolio website</Form.Label>
          <Form.Control
            value={form.portfolioUrl ?? ''}
            onChange={(e) => set('portfolioUrl', e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Label>Role applied for <Req /></Form.Label>
          <SearchableSelect
            options={roleOptions}
            value={form.roleAppliedOptionId}
            onChange={(roleAppliedOptionId) => { setForm((f) => ({ ...f, roleAppliedOptionId })); clearFE('roleApplied'); }}
            placeholder="Search roles…"
            isInvalid={!!fieldErrors.roleApplied}
          />
          {fieldErrors.roleApplied && (
            <div className="invalid-feedback d-block">{fieldErrors.roleApplied}</div>
          )}
        </Col>
        <Col md={12}>
          <Form.Label>Skills</Form.Label>
          <SearchableMultiSelect
            options={skillOptions}
            value={skillIds}
            onChange={setSkillIds}
            placeholder="Search skills…"
          />
        </Col>
        <Col md={12}>
          <Form.Label>Skills summary (from CV)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={form.skills ?? ''}
            onChange={(e) => set('skills', e.target.value)}
          />
        </Col>
        <Col md={12}>
          <Form.Label>Summary</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={form.summary ?? ''}
            onChange={(e) => set('summary', e.target.value)}
          />
        </Col>

        <Col md={12}>
          <hr className="mb-2" />
          <Form.Check
            type="checkbox"
            id="is-referred-edit"
            label="This candidate has been referred"
            checked={form.isReferred}
            onChange={(e) => setForm((f) => ({ ...f, isReferred: e.target.checked }))}
          />
        </Col>
        {form.isReferred && (
          <>
            <Col md={6}>
              <Form.Label>Reference name <Req /></Form.Label>
              <Form.Control
                value={form.referenceName ?? ''}
                onChange={(e) => { set('referenceName', e.target.value); clearFE('referenceName'); }}
                isInvalid={!!fieldErrors.referenceName}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.referenceName}</Form.Control.Feedback>
            </Col>
            <Col md={6}>
              <Form.Label>Reference email <Req /></Form.Label>
              <Form.Control
                type="email"
                value={form.referenceEmail ?? ''}
                onChange={(e) => { set('referenceEmail', e.target.value); clearFE('referenceEmail'); }}
                isInvalid={!!fieldErrors.referenceEmail}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.referenceEmail}</Form.Control.Feedback>
            </Col>
            <Col md={6}>
              <Form.Label>Employee ID</Form.Label>
              <Form.Control
                value={form.referenceEmployeeId ?? ''}
                onChange={(e) => set('referenceEmployeeId', e.target.value)}
              />
            </Col>
          </>
        )}
      </Row>
      </fieldset>

      {canWrite && (
        <div className="mt-3 d-flex align-items-center gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </Form>
  );
}

function CvFilesCard({ candidateId, files }: { candidateId: number; files: CVFileInfo[] }) {
  const [preview, setPreview] = useState<{ url: string; contentType: string } | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const revoke = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };
  useEffect(() => revoke, []); // revoke any object URL on unmount

  const openPreview = async (fileId: number) => {
    setError(null);
    setLoadingId(fileId);
    try {
      revoke();
      const { url, contentType } = await previewCvFile(candidateId, fileId);
      urlRef.current = url;
      setPreview({ url, contentType });
    } catch {
      setError('Could not load preview.');
    } finally {
      setLoadingId(null);
    }
  };

  const isPdf = preview?.contentType.includes('pdf') ?? false;

  return (
    <Card>
      <Card.Header>CV files</Card.Header>
      <Card.Body>
        {files.length === 0 ? (
          <p className="text-muted mb-0">No files.</p>
        ) : (
          <ul className="list-unstyled mb-3">
            {files.map((f) => (
              <li key={f.id} className="d-flex justify-content-between align-items-center py-1">
                <span className="text-truncate">{f.originalFileName}</span>
                <span className="d-flex align-items-center gap-2 ms-2">
                  <span className="text-muted small text-nowrap">
                    {f.fileType} · {formatSize(f.fileSizeBytes)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={loadingId === f.id}
                    onClick={() => openPreview(f.id)}
                  >
                    {loadingId === f.id ? 'Loading…' : 'Preview'}
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => downloadCvFile(candidateId, f.id)}>
                    Download
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && <Alert variant="danger" className="py-2">{error}</Alert>}

        {preview &&
          (isPdf ? (
            <iframe title="CV preview" src={preview.url} className="cv-preview-frame" />
          ) : (
            <Alert variant="info" className="mb-0">
              In-app preview isn't available for this file type. Use Download to open it.
            </Alert>
          ))}
      </Card.Body>
    </Card>
  );
}

type AddStatusFieldErrors = Partial<Record<'status' | 'comment' | 'taskDetails' | 'submissionUrl' | 'interviewAt' | 'interviewers', string>>;

function AddStatus({
  candidateId,
  onAdded,
}: {
  candidateId: number;
  onAdded: () => void;
}) {
  const { addToast } = useToast();
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewerIds, setInterviewerIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<AddStatusFieldErrors>({});
  const queryClient = useQueryClient();

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options', 'next', candidateId],
    queryFn: () => getNextStatusOptions(candidateId),
  });

  const requiresComment =
    status === 'Technical Assessment' ||
    status === 'Interview Completed' ||
    status === 'Reject' ||
    status === 'Discontinued';
  const requiresTaskDetails = status === 'Technical Assessment';
  const requiresSubmissionUrl = status === 'Submission Receieved';
  const requiresInterviewAt = status === 'Interview Scheduled';
  const requiresInterviewers = status === 'Interview Scheduled';

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: getAssignableUsers,
    enabled: requiresInterviewers,
  });

  const clearFE = (field: keyof AddStatusFieldErrors) =>
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));

  const mutation = useMutation({
    mutationFn: () =>
      addStatus(candidateId, {
        status: status.trim(),
        comment: comment.trim() || null,
        taskDetails: taskDetails.trim() || null,
        submissionUrl: submissionUrl.trim() || null,
        interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
        interviewerUserIds: requiresInterviewers ? interviewerIds : null,
      }),
    onSuccess: () => {
      setStatus('');
      setComment('');
      setTaskDetails('');
      setSubmissionUrl('');
      setInterviewAt('');
      setInterviewerIds([]);
      setFieldErrors({});

      void queryClient.invalidateQueries({ queryKey: ['status-options', 'next', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      addToast('Status added.');
      onAdded();
    },
    onError: () => addToast('Failed to add status.', 'danger'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: AddStatusFieldErrors = {};
    if (!status) errs.status = 'Status is required.';
    if (requiresComment && !comment.trim()) errs.comment = 'A comment is required.';
    if (requiresTaskDetails && !taskDetails.trim()) errs.taskDetails = 'Task details are required.';
    if (requiresSubmissionUrl && !submissionUrl.trim()) errs.submissionUrl = 'Submission link is required.';
    if (requiresInterviewAt && !interviewAt) errs.interviewAt = 'Interview date/time is required.';
    if (requiresInterviewers && interviewerIds.length === 0)
      errs.interviewers = 'Select at least one interviewer.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    mutation.mutate();
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {statusOptions.length === 0 && (
        <Alert variant="info">
          No next status is available from the candidate&apos;s current status.
        </Alert>
      )}
      <Row className="g-2">
        <Col md={12}>
          <Form.Label className="mb-1">New status <Req /></Form.Label>
          <Form.Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); clearFE('status'); }}
            isInvalid={!!fieldErrors.status}
          >
            <option value="">Select status</option>
            {statusOptions.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{fieldErrors.status}</Form.Control.Feedback>
        </Col>
        {requiresTaskDetails && (
          <Col md={12}>
            <Form.Label className="mb-1">Task details <Req /></Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={taskDetails}
              onChange={(e) => { setTaskDetails(e.target.value); clearFE('taskDetails'); }}
              isInvalid={!!fieldErrors.taskDetails}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.taskDetails}</Form.Control.Feedback>
          </Col>
        )}
        {requiresSubmissionUrl && (
          <Col md={12}>
            <Form.Label className="mb-1">Submission link <Req /></Form.Label>
            <Form.Control
              type="url"
              value={submissionUrl}
              onChange={(e) => { setSubmissionUrl(e.target.value); clearFE('submissionUrl'); }}
              isInvalid={!!fieldErrors.submissionUrl}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.submissionUrl}</Form.Control.Feedback>
          </Col>
        )}
        {requiresInterviewAt && (
          <Col md={12}>
            <Form.Label className="mb-1">Interview date/time <Req /></Form.Label>
            <Form.Control
              type="datetime-local"
              value={interviewAt}
              onChange={(e) => { setInterviewAt(e.target.value); clearFE('interviewAt'); }}
              isInvalid={!!fieldErrors.interviewAt}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.interviewAt}</Form.Control.Feedback>
          </Col>
        )}
        {requiresInterviewers && (
          <Col md={12}>
            <Form.Label className="mb-1">Interviewers <Req /></Form.Label>
            <SearchableMultiSelect
              options={assignableUsers.map((u) => ({ id: u.id, name: u.name }))}
              value={interviewerIds}
              onChange={(ids) => { setInterviewerIds(ids); clearFE('interviewers'); }}
              placeholder="Search users to assign…"
            />
            {fieldErrors.interviewers && (
              <div className="text-danger small mt-1">{fieldErrors.interviewers}</div>
            )}
            <Form.Text muted>Assigned users are notified and can fill the evaluation form.</Form.Text>
          </Col>
        )}
        <Col md={12}>
          {requiresComment && <Form.Label className="mb-1">Comment <Req /></Form.Label>}
          <Form.Control
            as="textarea"
            rows={2}
            placeholder={requiresComment ? '' : 'Comment (optional)'}
            value={comment}
            onChange={(e) => { setComment(e.target.value); clearFE('comment'); }}
            isInvalid={!!fieldErrors.comment}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.comment}</Form.Control.Feedback>
        </Col>
      </Row>
      <Button type="submit" size="sm" className="mt-2" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding…' : 'Add status'}
      </Button>
    </Form>
  );
}
