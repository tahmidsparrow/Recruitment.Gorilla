import { useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { createCandidate } from '../services/api';
import type { CVDraft, DuplicateCandidate } from '../types';

interface Props {
  draft: CVDraft;
  onSaved: () => void;
  onCancel: () => void;
}

const DEFAULT_STATUS = 'Uploaded';

export default function CandidateForm({ draft, onSaved, onCancel }: Props) {
  const [fullName, setFullName] = useState(draft.fullName ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [phone, setPhone] = useState(draft.phone ?? '');
  const [currentTitle, setCurrentTitle] = useState(draft.currentTitle ?? '');
  const [linkedInUrl, setLinkedInUrl] = useState(draft.linkedInUrl ?? '');
  const [skills, setSkills] = useState(draft.skills ?? '');
  const [summary, setSummary] = useState(draft.summary ?? '');
  const [changedBy, setChangedBy] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null);

  const save = async (allowDuplicate: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const result = await createCandidate({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        currentTitle: currentTitle.trim() || null,
        skills: skills.trim() || null,
        summary: summary.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        storedFileName: draft.storedFileName,
        originalFileName: draft.originalFileName,
        fileType: draft.fileType,
        fileSizeBytes: draft.fileSizeBytes,
        initialStatus: DEFAULT_STATUS,
        changedBy: changedBy.trim() || 'admin',
        allowDuplicate,
      });

      if (result.kind === 'duplicate') {
        setDuplicate(result.duplicate);
        return;
      }
      onSaved();
    } catch {
      setError('Failed to save candidate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    void save(false);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Review extracted details</h5>
        <span className="text-muted small">{draft.originalFileName}</span>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

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
          <Form.Label>Full name *</Form.Label>
          <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Col>
        <Col md={6}>
          <Form.Label>Email *</Form.Label>
          <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Col>
        <Col md={6}>
          <Form.Label>Phone</Form.Label>
          <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Current title</Form.Label>
          <Form.Control value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} />
        </Col>
        <Col md={12}>
          <Form.Label>LinkedIn URL</Form.Label>
          <Form.Control value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} />
        </Col>
        <Col md={12}>
          <Form.Label>Skills</Form.Label>
          <Form.Control as="textarea" rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} />
        </Col>
        <Col md={12}>
          <Form.Label>Summary</Form.Label>
          <Form.Control as="textarea" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label>Reviewed by</Form.Label>
          <Form.Control
            placeholder="admin"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
          />
        </Col>
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
