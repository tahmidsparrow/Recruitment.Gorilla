import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStatus,
  deleteCandidate,
  downloadCvFile,
  getCandidate,
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
  useEffect(() => setForm(candidate), [candidate]);

  const set = (field: keyof CandidateDetail, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

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
      }),
    onSuccess: onSaved,
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
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
        <Col md={12}>
          <Form.Label>LinkedIn URL</Form.Label>
          <Form.Control
            value={form.linkedInUrl ?? ''}
            onChange={(e) => set('linkedInUrl', e.target.value)}
          />
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
  const [changedBy, setChangedBy] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      addStatus(candidateId, {
        status: status.trim(),
        comment: comment.trim() || null,
        changedBy: changedBy.trim() || 'admin',
      }),
    onSuccess: () => {
      setStatus('');
      setComment('');
      onAdded();
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        if (status.trim()) mutation.mutate();
      }}
    >
      {mutation.isError && <Alert variant="danger">Failed to add status.</Alert>}
      <Row className="g-2">
        <Col md={7}>
          <Form.Control
            placeholder="New status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </Col>
        <Col md={5}>
          <Form.Control
            placeholder="Changed by"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
          />
        </Col>
        <Col md={12}>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Col>
      </Row>
      <Button type="submit" size="sm" className="mt-2" disabled={!status.trim() || mutation.isPending}>
        {mutation.isPending ? 'Adding…' : 'Add status'}
      </Button>
    </Form>
  );
}
