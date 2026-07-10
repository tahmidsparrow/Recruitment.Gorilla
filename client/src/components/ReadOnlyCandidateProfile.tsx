import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { downloadCvFile, previewCvFile } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { skillColorClass } from '../utils/skillColors';
import type { CandidateDetail } from '../types';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

/* Inline icons (house style, currentColor). */
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.38-1.34-1.75-1.34-1.75-1.1-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5z" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="mb-3">
      <div className="profile-field-label">{label}</div>
      <div className="readonly-value">{value}</div>
    </div>
  );
}

/** Non-editable candidate profile shown alongside the evaluation form. */
export default function ReadOnlyCandidateProfile({ candidate }: { candidate: CandidateDetail }) {
  const [preview, setPreview] = useState<{ url: string; contentType: string } | null>(null);
  const [previewName, setPreviewName] = useState('');

  const role = candidate.roleApplied ?? candidate.appliedRole;

  const openPreview = async (fileId: number, name: string) => {
    if (preview) URL.revokeObjectURL(preview.url);
    const p = await previewCvFile(candidate.id, fileId);
    setPreview(p);
    setPreviewName(name);
  };

  const hasLinks = candidate.linkedInUrl || candidate.githubUrl || candidate.portfolioUrl;

  return (
    <Card className="h-100 profile-card">
      <div className="profile-header">
        <div className="profile-avatar">{initials(candidate.fullName) || '?'}</div>
        <div className="flex-grow-1">
          <h5 className="mb-0">{candidate.fullName}</h5>
          {candidate.currentTitle && <div className="profile-subtitle">{candidate.currentTitle}</div>}
          <div className="mt-2"><StatusBadge status={candidate.currentStatus} /></div>
        </div>
      </div>

      <Card.Body>
        {hasLinks && (
          <div className="profile-links mb-3">
            {candidate.linkedInUrl && (
              <a href={candidate.linkedInUrl} target="_blank" rel="noreferrer" className="profile-link">
                <LinkedInIcon /> LinkedIn
              </a>
            )}
            {candidate.githubUrl && (
              <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="profile-link">
                <GitHubIcon /> GitHub
              </a>
            )}
            {candidate.portfolioUrl && (
              <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="profile-link">
                <GlobeIcon /> Portfolio
              </a>
            )}
          </div>
        )}

        <div className="profile-grid">
          <Field label="Email" value={candidate.email} />
          <Field label="Phone" value={candidate.phone} />
          <Field label="Role applied for" value={role} />
        </div>

        {candidate.skillOptions.length > 0 && (
          <div className="mb-3">
            <div className="profile-field-label">Skills</div>
            <div className="d-flex flex-wrap gap-1">
              {candidate.skillOptions.map((s) => (
                <span key={s.id} className={skillColorClass(s.name)}>{s.name}</span>
              ))}
            </div>
          </div>
        )}

        <Field label="Summary" value={candidate.summary} />
        {candidate.isReferred && (
          <Field
            label="Referred by"
            value={`${candidate.referenceName ?? '—'}${candidate.referenceEmail ? ` (${candidate.referenceEmail})` : ''}`}
          />
        )}

        {candidate.cvFiles.length > 0 && (
          <div className="mt-3">
            <div className="profile-field-label mb-1">CV files</div>
            {candidate.cvFiles.map((f) => (
              <div key={f.id} className="d-flex align-items-center justify-content-between gap-2 mb-1">
                <span className="small text-truncate">{f.originalFileName} <span className="text-muted">({formatSize(f.fileSizeBytes)})</span></span>
                <span className="d-flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline-secondary" onClick={() => void openPreview(f.id, f.originalFileName)}>Preview</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => void downloadCvFile(candidate.id, f.id)}>Download</Button>
                </span>
              </div>
            ))}
          </div>
        )}

        {preview && (
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small text-muted text-truncate">{previewName}</span>
              <Button size="sm" variant="link" className="p-0" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>Close</Button>
            </div>
            {preview.contentType.includes('pdf') ? (
              <iframe title="CV preview" src={preview.url} className="cv-preview-frame" style={{ width: '100%', height: 480, border: '1px solid var(--bs-border-color)' }} />
            ) : (
              <Alert variant="info" className="mb-0">In-app preview isn't available for this file type. Use Download.</Alert>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
