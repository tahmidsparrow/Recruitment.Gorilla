import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchableMultiSelect } from './SearchableSelect';
import { useToast } from './ToastStack';
import {
  addStatus,
  getActiveInterviewTypes,
  getAssignableUsers,
  getNextStatusOptions,
} from '../services/api';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const Req = () => (
  <span className="text-danger" aria-hidden="true">
    *
  </span>
);

interface AddStatusFieldErrors {
  status?: string;
  comment?: string;
  taskDetails?: string;
  submissionUrl?: string;
  interviewAt?: string;
  interviewers?: string;
}

export interface AddStatusModalProps {
  candidateId: number;
  candidateName?: string;
  initialStatus?: string;
  show: boolean;
  onHide: () => void;
  onAdded: () => void;
}

export default function AddStatusModal({
  candidateId,
  candidateName,
  initialStatus,
  show,
  onHide,
  onAdded,
}: AddStatusModalProps) {
  const { addToast } = useToast();
  const [status, setStatus] = useState(initialStatus || '');
  const [comment, setComment] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [interviewerIds, setInterviewerIds] = useState<number[]>([]);
  const [interviewTypeIds, setInterviewTypeIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<AddStatusFieldErrors>({});
  const queryClient = useQueryClient();

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options', 'next', candidateId],
    queryFn: () => getNextStatusOptions(candidateId),
    enabled: show && !!candidateId,
  });

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
    }
  }, [initialStatus, show]);

  const requiresComment =
    status === 'Technical Assessment' ||
    status === 'Interview Completed' ||
    status === 'Reject' ||
    status === 'Discontinued';
  const requiresTaskDetails = status === 'Technical Assessment';
  const requiresSubmissionUrl = status === 'Submission Received' || status === 'Submission Receieved';
  const requiresInterviewAt = status === 'Interview Scheduled';
  const requiresInterviewers = status === 'Interview Scheduled';

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: getAssignableUsers,
    enabled: requiresInterviewers && show,
  });

  const { data: interviewTypes = [] } = useQuery({
    queryKey: ['interview-types', 'active'],
    queryFn: getActiveInterviewTypes,
    enabled: requiresInterviewers && show,
  });

  const clearFE = (field: keyof AddStatusFieldErrors) =>
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));

  const resetForm = () => {
    setStatus(initialStatus || '');
    setComment('');
    setTaskDetails('');
    setSubmissionUrl('');
    setInterviewAt('');
    setDurationMinutes(60);
    setInterviewerIds([]);
    setInterviewTypeIds([]);
    setFieldErrors({});
  };

  const handleHide = () => {
    resetForm();
    onHide();
  };

  const mutation = useMutation({
    mutationFn: () =>
      addStatus(candidateId, {
        status: status.trim(),
        comment: comment.trim() || null,
        taskDetails: taskDetails.trim() || null,
        submissionUrl: submissionUrl.trim() || null,
        interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
        interviewerUserIds: requiresInterviewers ? interviewerIds : null,
        interviewTypeOptionIds: requiresInterviewers ? interviewTypeIds : null,
        interviewDurationMinutes: requiresInterviewAt ? durationMinutes : null,
      }),
    onSuccess: () => {
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['status-options', 'next', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      addToast(`Status updated to '${status}'.`);
      onAdded();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to add status.';
      addToast(msg, 'danger');
    },
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
    <Modal show={show} onHide={handleHide} centered size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>
            {candidateName ? `Advance Status — ${candidateName}` : 'Add a status'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="form-help mb-4">
            Moves the candidate to the next stage and records who changed it.
          </p>
          {statusOptions.length === 0 && !initialStatus && (
            <div className="alert-info-soft mb-4">
              No next status is available from the candidate&apos;s current status.
            </div>
          )}
          <Row className="g-3">
            <Col md={12}>
              <Form.Label className="mb-1">
                New status <Req />
              </Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  clearFE('status');
                }}
                isInvalid={!!fieldErrors.status}
              >
                <option value="">Select status</option>
                {statusOptions.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
                {initialStatus && !statusOptions.some((o) => o.name === initialStatus) && (
                  <option value={initialStatus}>{initialStatus}</option>
                )}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{fieldErrors.status}</Form.Control.Feedback>
            </Col>

            {requiresTaskDetails && (
              <Col md={12}>
                <Form.Label className="mb-1">
                  Task details <Req />
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={taskDetails}
                  onChange={(e) => {
                    setTaskDetails(e.target.value);
                    clearFE('taskDetails');
                  }}
                  isInvalid={!!fieldErrors.taskDetails}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.taskDetails}</Form.Control.Feedback>
              </Col>
            )}

            {requiresSubmissionUrl && (
              <Col md={12}>
                <Form.Label className="mb-1">
                  Submission link <Req />
                </Form.Label>
                <Form.Control
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => {
                    setSubmissionUrl(e.target.value);
                    clearFE('submissionUrl');
                  }}
                  isInvalid={!!fieldErrors.submissionUrl}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.submissionUrl}</Form.Control.Feedback>
              </Col>
            )}

            {requiresInterviewAt && (
              <Col md={12}>
                <Form.Label className="mb-1">
                  Interview date/time <Req />
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(e) => {
                    setInterviewAt(e.target.value);
                    clearFE('interviewAt');
                  }}
                  isInvalid={!!fieldErrors.interviewAt}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.interviewAt}</Form.Control.Feedback>
              </Col>
            )}

            {requiresInterviewAt && (
              <Col md={12}>
                <Form.Label className="mb-1">Duration</Form.Label>
                <Form.Select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  aria-label="Interview duration"
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </Form.Select>
                <Form.Text muted>Sets the end time on the calendar invite sent to interviewers.</Form.Text>
              </Col>
            )}

            {requiresInterviewers && (
              <Col md={12}>
                <Form.Label className="mb-1">Interview types</Form.Label>
                <SearchableMultiSelect
                  options={interviewTypes.map((t) => ({ id: t.id, name: t.name }))}
                  value={interviewTypeIds}
                  onChange={setInterviewTypeIds}
                  placeholder="Tag this interview (Technical, HR, 1st Level…)"
                />
                <Form.Text muted>Optional tags shown on the status history and interview page.</Form.Text>
              </Col>
            )}

            {requiresInterviewers && (
              <Col md={12}>
                <Form.Label className="mb-1">
                  Interviewers <Req />
                </Form.Label>
                <SearchableMultiSelect
                  options={assignableUsers.map((u) => ({ id: u.id, name: u.name }))}
                  value={interviewerIds}
                  onChange={(ids) => {
                    setInterviewerIds(ids);
                    clearFE('interviewers');
                  }}
                  placeholder="Search users to assign…"
                />
                {fieldErrors.interviewers && (
                  <div className="text-danger small mt-1">{fieldErrors.interviewers}</div>
                )}
                <Form.Text muted>Assigned users are notified and can fill the evaluation form.</Form.Text>
              </Col>
            )}

            <Col md={12}>
              {requiresComment ? (
                <Form.Label className="mb-1">
                  Comment <Req />
                </Form.Label>
              ) : (
                requiresInterviewers && <Form.Label className="mb-1">Notes for interviewers (optional)</Form.Label>
              )}
              <Form.Control
                as="textarea"
                rows={2}
                placeholder={requiresComment || requiresInterviewers ? '' : 'Comment (optional)'}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  clearFE('comment');
                }}
                isInvalid={!!fieldErrors.comment}
              />
              {requiresInterviewers && (
                <Form.Text muted>Shared with the assigned interviewers on the interview page.</Form.Text>
              )}
              <Form.Control.Feedback type="invalid">{fieldErrors.comment}</Form.Control.Feedback>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleHide}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner size="sm" aria-hidden="true" /> Saving…
              </>
            ) : (
              'Save status'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
