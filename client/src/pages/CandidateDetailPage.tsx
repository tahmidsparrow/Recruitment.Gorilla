import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStatus,
  deleteCandidate,
  downloadCvFile,
  getCandidate,
  getCandidateRoles,
  getNextStatusOptions,
  updateCandidate,
} from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import type { CandidateDetail } from '../types';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const candidateId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
        <h2 className="mb-0">{data.fullName}</h2>
        <Button variant="outline-danger" onClick={() => setConfirmDelete(true)}>
          Delete candidate
        </Button>
      </div>

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
                onSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
                  void queryClient.invalidateQueries({ queryKey: ['candidates'] });
                }}
              />
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>CV files</Card.Header>
            <Card.Body>
              {data.cvFiles.length === 0 ? (
                <p className="text-muted mb-0">No files.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {data.cvFiles.map((f) => (
                    <li key={f.id} className="d-flex justify-content-between py-1">
                      <Button
                        variant="link"
                        className="p-0 text-start"
                        onClick={() => downloadCvFile(candidateId, f.id)}
                      >
                        {f.originalFileName}
                      </Button>
                      <span className="text-muted small">
                        {f.fileType} · {formatSize(f.fileSizeBytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card>
            <Card.Header>Status history</Card.Header>
            <Card.Body>
              <AddStatus
                candidateId={candidateId}
                onAdded={() =>
                  queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
                }
              />
              <hr />
              <StatusTimeline history={data.statusHistory} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function ProfileEditor({
  candidate,
  onSaved,
}: {
  candidate: CandidateDetail;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(candidate);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(candidate), [candidate]);

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['candidate-roles'],
    queryFn: getCandidateRoles,
  });

  const set = (field: keyof CandidateDetail, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      updateCandidate(candidate.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || null,
        currentTitle: form.currentTitle || null,
        skills: form.skills || null,
        summary: form.summary || null,
        linkedInUrl: form.linkedInUrl || null,
        githubUrl: form.githubUrl || null,
        portfolioUrl: form.portfolioUrl || null,
        appliedRole: form.appliedRole || null,
        isReferred: form.isReferred,
        referenceName: form.isReferred ? form.referenceName || null : null,
        referenceEmail: form.isReferred ? form.referenceEmail || null : null,
        referenceEmployeeId: form.isReferred ? form.referenceEmployeeId || null : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-roles'] });
      onSaved();
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        if (form.isReferred && (!form.referenceName?.trim() || !form.referenceEmail?.trim())) {
          setError('A referred candidate requires a reference name and email.');
          return;
        }
        setError(null);
        mutation.mutate();
      }}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="g-3">
        <Col md={6}>
          <Form.Label>Full name</Form.Label>
          <Form.Control value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Email</Form.Label>
          <Form.Control value={form.email} onChange={(e) => set('email', e.target.value)} />
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
          <Form.Label>Role applied for</Form.Label>
          <Form.Control
            list="role-options-edit"
            value={form.appliedRole ?? ''}
            onChange={(e) => set('appliedRole', e.target.value)}
            placeholder="e.g. Backend Engineer"
          />
          <datalist id="role-options-edit">
            {roleOptions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Col>
        <Col md={12}>
          <Form.Label>Skills</Form.Label>
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
              <Form.Label>Reference name *</Form.Label>
              <Form.Control
                value={form.referenceName ?? ''}
                onChange={(e) => set('referenceName', e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Reference email *</Form.Label>
              <Form.Control
                type="email"
                value={form.referenceEmail ?? ''}
                onChange={(e) => set('referenceEmail', e.target.value)}
              />
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

      <div className="mt-3 d-flex align-items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {mutation.isSuccess && <span className="text-success small">Saved.</span>}
        {mutation.isError && <span className="text-danger small">Save failed.</span>}
      </div>
    </Form>
  );
}

function AddStatus({
  candidateId,
  onAdded,
}: {
  candidateId: number;
  onAdded: () => void;
}) {
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [changedBy, setChangedBy] = useState('');
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
  const canSubmit =
    !!status &&
    (!requiresComment || !!comment.trim()) &&
    (!requiresTaskDetails || !!taskDetails.trim()) &&
    (!requiresSubmissionUrl || !!submissionUrl.trim()) &&
    (!requiresInterviewAt || !!interviewAt);

  const mutation = useMutation({
    mutationFn: () =>
      addStatus(candidateId, {
        status: status.trim(),
        comment: comment.trim() || null,
        taskDetails: taskDetails.trim() || null,
        submissionUrl: submissionUrl.trim() || null,
        interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
        changedBy: changedBy.trim() || 'admin',
      }),
    onSuccess: () => {
      setStatus('');
      setComment('');
      setTaskDetails('');
      setSubmissionUrl('');
      setInterviewAt('');
      void queryClient.invalidateQueries({ queryKey: ['status-options', 'next', candidateId] });
      onAdded();
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) mutation.mutate();
      }}
    >
      {mutation.isError && <Alert variant="danger">Failed to add status.</Alert>}
      {statusOptions.length === 0 && (
        <Alert variant="info">
          No next status is available from the candidate&apos;s current status.
        </Alert>
      )}
      <Row className="g-2">
        <Col md={7}>
          <Form.Select
            aria-label="New status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Select status</option>
            {statusOptions.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={5}>
          <Form.Control
            placeholder="Changed by"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
          />
        </Col>
        {requiresTaskDetails && (
          <Col md={12}>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Assigned task details *"
              value={taskDetails}
              onChange={(e) => setTaskDetails(e.target.value)}
              required
            />
          </Col>
        )}
        {requiresSubmissionUrl && (
          <Col md={12}>
            <Form.Control
              type="url"
              placeholder="Submission link *"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              required
            />
          </Col>
        )}
        {requiresInterviewAt && (
          <Col md={12}>
            <Form.Label className="mb-1">Interview date/time *</Form.Label>
            <Form.Control
              type="datetime-local"
              value={interviewAt}
              onChange={(e) => setInterviewAt(e.target.value)}
              required
            />
          </Col>
        )}
        <Col md={12}>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder={requiresComment ? 'Comment *' : 'Comment (optional)'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={requiresComment}
          />
        </Col>
      </Row>
      <Button type="submit" size="sm" className="mt-2" disabled={!canSubmit || mutation.isPending}>
        {mutation.isPending ? 'Adding…' : 'Add status'}
      </Button>
    </Form>
  );
}
