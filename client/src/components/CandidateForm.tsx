import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createCandidate, getInitialStatusOptions, getActiveRoleOptions, getActiveSkillOptions } from '../services/api';
import { SearchableSelect, SearchableMultiSelect } from './SearchableSelect';
import { useToast } from './ToastStack';
import type { CVDraft, DuplicateCandidate } from '../types';

interface Props {
  draft: CVDraft;
  onSaved: () => void;
  onCancel: () => void;
}

const EMAIL_REGEX = /^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i;
type FieldKey = 'fullName' | 'email' | 'roleApplied' | 'relevantExperience' | 'referenceName' | 'referenceEmail';
type FieldErrors = Partial<Record<FieldKey, string>>;

function Req() {
  return <span className="required-star" aria-hidden="true">*</span>;
}

export default function CandidateForm({ draft, onSaved, onCancel }: Props) {
  const { addToast } = useToast();
  const [fullName, setFullName] = useState(draft.fullName ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [phone, setPhone] = useState(draft.phone ?? '');
  const [currentTitle, setCurrentTitle] = useState(draft.currentTitle ?? '');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState(draft.linkedInUrl ?? '');
  const [githubUrl, setGithubUrl] = useState(draft.githubUrl ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [roleAppliedOptionId, setRoleAppliedOptionId] = useState<number | null>(null);
  const [skillOptionIds, setSkillOptionIds] = useState<number[]>([]);
  const [isReferred, setIsReferred] = useState(false);
  const [referenceName, setReferenceName] = useState('');
  const [referenceEmail, setReferenceEmail] = useState('');
  const [referenceEmployeeId, setReferenceEmployeeId] = useState('');
  const [skills, setSkills] = useState(draft.skills ?? '');
  const [summary, setSummary] = useState(draft.summary ?? '');
  const [initialStatus, setInitialStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options', 'initial'],
    queryFn: getInitialStatusOptions,
  });

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['role-options', 'active'],
    queryFn: getActiveRoleOptions,
  });

  const { data: skillOptions = [] } = useQuery({
    queryKey: ['skill-options', 'active'],
    queryFn: getActiveSkillOptions,
  });

  useEffect(() => {
    if (!initialStatus && statusOptions.length > 0) {
      setInitialStatus(statusOptions[0].name);
    }
  }, [initialStatus, statusOptions]);

  // A recruiter assigned to exactly one role gets it auto-selected; with several (or an Admin),
  // no auto-selection happens.
  useEffect(() => {
    if (roleOptions.length === 1 && roleAppliedOptionId === null) {
      setRoleAppliedOptionId(roleOptions[0].id);
    }
  }, [roleOptions, roleAppliedOptionId]);

  const clearFE = (field: FieldKey) =>
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));

  const save = async (allowDuplicate: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await createCandidate({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        currentTitle: currentTitle.trim() || null,
        relevantExperience: relevantExperience.trim(),
        skills: skills.trim() || null,
        summary: summary.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        appliedRole: null,
        roleAppliedOptionId,
        skillOptionIds,
        isReferred,
        referenceName: isReferred ? referenceName.trim() || null : null,
        referenceEmail: isReferred ? referenceEmail.trim() || null : null,
        referenceEmployeeId: isReferred ? referenceEmployeeId.trim() || null : null,
        storedFileName: draft.storedFileName,
        originalFileName: draft.originalFileName,
        fileType: draft.fileType,
        fileSizeBytes: draft.fileSizeBytes,
        initialStatus,
        initialStatusComment: null,
        allowDuplicate,
      });

      if (result.kind === 'duplicate') {
        setDuplicate(result.duplicate);
        return;
      }
      addToast('Candidate saved successfully.');
      onSaved();
    } catch {
      setSaveError('Failed to save candidate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!EMAIL_REGEX.test(email.trim())) errs.email = 'A valid email address is required.';
    if (!relevantExperience.trim()) errs.relevantExperience = 'Relevant experience is required.';
    if (!roleAppliedOptionId) errs.roleApplied = 'Role applied for is required.';
    if (isReferred && !referenceName.trim()) errs.referenceName = 'Reference name is required.';
    if (isReferred && !EMAIL_REGEX.test(referenceEmail.trim()))
      errs.referenceEmail = 'A valid reference email is required.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    void save(false);
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Review extracted details</h5>
        <span className="text-muted small">{draft.originalFileName}</span>
      </div>

      {saveError && <Alert variant="danger">{saveError}</Alert>}

      {duplicate && (
        <Alert variant="warning">
          {duplicate.message}{' '}
          <Link to={`/candidates/${duplicate.existing.id}`}>Open existing candidate</Link>.
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline-warning"
              disabled={saving}
              onClick={() => void save(true)}
            >
              Save anyway
            </Button>
          </div>
        </Alert>
      )}

      <Row className="g-3">
        <Col md={6}>
          <Form.Label>Full name <Req /></Form.Label>
          <Form.Control
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); clearFE('fullName'); }}
            isInvalid={!!fieldErrors.fullName}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>Email <Req /></Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFE('email'); }}
            isInvalid={!!fieldErrors.email}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>Phone</Form.Label>
          <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Current title</Form.Label>
          <Form.Control value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Relevant Experience <Req /></Form.Label>
          <Form.Control
            value={relevantExperience}
            placeholder="e.g. 3 Years"
            onChange={(e) => { setRelevantExperience(e.target.value); clearFE('relevantExperience'); }}
            isInvalid={!!fieldErrors.relevantExperience}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.relevantExperience}</Form.Control.Feedback>
        </Col>
        <Col md={6}>
          <Form.Label>LinkedIn URL</Form.Label>
          <Form.Control value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>GitHub URL</Form.Label>
          <Form.Control value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Portfolio website</Form.Label>
          <Form.Control value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Role applied for <Req /></Form.Label>
          <SearchableSelect
            options={roleOptions}
            value={roleAppliedOptionId}
            onChange={(v) => { setRoleAppliedOptionId(v); clearFE('roleApplied'); }}
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
            value={skillOptionIds}
            onChange={setSkillOptionIds}
            placeholder="Search skills…"
          />
        </Col>
        <Col md={12}>
          <Form.Label>Skills summary (from CV)</Form.Label>
          <Form.Control as="textarea" rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} />
        </Col>
        <Col md={12}>
          <Form.Label>Summary</Form.Label>
          <Form.Control as="textarea" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Col>
        <Col md={12}>
          <hr className="mb-2" />
          <Form.Check
            type="checkbox"
            id="is-referred"
            label="This candidate has been referred"
            checked={isReferred}
            onChange={(e) => setIsReferred(e.target.checked)}
          />
        </Col>
        {isReferred && (
          <>
            <Col md={6}>
              <Form.Label>Reference name <Req /></Form.Label>
              <Form.Control
                value={referenceName}
                onChange={(e) => { setReferenceName(e.target.value); clearFE('referenceName'); }}
                isInvalid={!!fieldErrors.referenceName}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.referenceName}</Form.Control.Feedback>
            </Col>
            <Col md={6}>
              <Form.Label>Reference email <Req /></Form.Label>
              <Form.Control
                type="email"
                value={referenceEmail}
                onChange={(e) => { setReferenceEmail(e.target.value); clearFE('referenceEmail'); }}
                isInvalid={!!fieldErrors.referenceEmail}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.referenceEmail}</Form.Control.Feedback>
            </Col>
            <Col md={6}>
              <Form.Label>Employee ID</Form.Label>
              <Form.Control
                value={referenceEmployeeId}
                onChange={(e) => setReferenceEmployeeId(e.target.value)}
              />
            </Col>
          </>
        )}
      </Row>

      <div className="d-flex gap-2 mt-4">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save candidate'}
        </Button>
        <Button type="button" variant="outline-secondary" disabled={saving} onClick={onCancel}>
          Skip
        </Button>
      </div>
    </Form>
  );
}
