import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  Users,
} from 'lucide-react';
import { downloadCvFile, previewCvFile } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { skillColorClass } from '../utils/skillColors';
import type { CandidateDetail } from '../types';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

/* Brand SVGs */
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.38-1.34-1.75-1.34-1.75-1.1-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5z" />
  </svg>
);

const LeetCodeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.014l5.314-5.69a1.372 1.372 0 0 0-.961-2.324zM16.4 8.7a1.38 1.38 0 0 0-1.38 1.38v6.24a1.38 1.38 0 0 0 2.76 0v-6.24A1.38 1.38 0 0 0 16.4 8.7z" />
  </svg>
);

const CodeforcesIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M4.5 7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-3 0V9a1.5 1.5 0 0 1 1.5-1.5zm7.5-4.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-3 0V4.5A1.5 1.5 0 0 1 12 3zm7.5 9a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-3 0v-6a1.5 1.5 0 0 1 1.5-1.5z" />
  </svg>
);

const GitLabIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M23.6 9.61l-.03-.08L20.3 1.2a.84.84 0 0 0-1.59 0l-2.18 5.7H7.47L5.29 1.2a.84.84 0 0 0-1.59 0L.43 9.53l-.03.08a4.93 4.93 0 0 0 1.76 5.61l9.84 7.15 9.84-7.15a4.93 4.93 0 0 0 1.76-5.61z" />
  </svg>
);

const HackerRankIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0zm1.72 17.52h-2.1v-4.5h-1.92v4.5h-2.1V6.48h2.1v4.32h1.92V6.48h2.1z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="btn-cv-download__icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
  </svg>
);

const SUMMARY_COLLAPSE_THRESHOLD = 280;

interface ContactTileProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string;
  allowCopy?: boolean;
}

function ContactTile({ icon, label, value, href, allowCopy = false }: ContactTileProps) {
  const [copied, setCopied] = useState(false);

  const displayVal = value?.trim() || '—';

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value?.trim()) return;
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="contact-tile profile-tile">
      <span className="contact-tile__icon">{icon}</span>
      <div className="contact-tile__content">
        <span className="contact-tile__label">{label}</span>
        <div className="contact-tile__value-row">
          {href && value?.trim() ? (
            <a href={href} className="contact-tile__link" title={value}>
              {value}
            </a>
          ) : (
            <span className={`contact-tile__text ${!value?.trim() ? 'text-muted' : ''}`} title={displayVal}>
              {displayVal}
            </span>
          )}
          {allowCopy && value?.trim() && (
            <button
              type="button"
              className={`contact-tile__copy-btn ${copied ? 'contact-tile__copy-btn--copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy to clipboard'}
              aria-label={`Copy ${label}`}
            >
              {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Non-editable candidate profile shown on Candidate Detail page and alongside evaluation form.
 */
export default function ReadOnlyCandidateProfile({
  candidate,
  showCvFiles = true,
  className = '',
}: {
  candidate: CandidateDetail;
  showCvFiles?: boolean;
  className?: string;
}) {
  const [preview, setPreview] = useState<{ url: string; contentType: string } | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const openPreview = async (fileId: number, name: string) => {
    if (preview) URL.revokeObjectURL(preview.url);
    const p = await previewCvFile(candidate.id, fileId);
    setPreview(p);
    setPreviewName(name);
  };

  const hasLinks =
    candidate.linkedInUrl ||
    candidate.githubUrl ||
    candidate.portfolioUrl ||
    candidate.leetCodeUrl ||
    candidate.codeforcesUrl ||
    candidate.hackerRankUrl ||
    candidate.gitLabUrl;

  const summaryIsLong = (candidate.summary?.length ?? 0) > SUMMARY_COLLAPSE_THRESHOLD;
  const summaryCollapsed = summaryIsLong && !summaryExpanded;

  // Extract skills from skillOptions or raw skills string fallback
  const skillsList: string[] = React.useMemo(() => {
    if (candidate.skillOptions && candidate.skillOptions.length > 0) {
      return candidate.skillOptions.map((s) => s.name);
    }
    if (candidate.skills && candidate.skills.trim()) {
      return candidate.skills
        .split(/[,•|;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  }, [candidate.skillOptions, candidate.skills]);

  return (
    <Card className={`profile-card ${className}`.trim()}>
      <div className="profile-header">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="profile-field-label">Current position</div>
            <div className="profile-title">{candidate.currentTitle || '—'}</div>
          </div>
          <StatusBadge status={candidate.currentStatus} />
        </div>

        {/* Brand Coding & Social Profile Badges */}
        {hasLinks && (
          <div className="profile-links mt-4 flex flex-wrap gap-2">
            {candidate.linkedInUrl && (
              <a
                href={candidate.linkedInUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--linkedin"
                title="LinkedIn Profile"
              >
                <LinkedInIcon />
                <span>LinkedIn</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.githubUrl && (
              <a
                href={candidate.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--github"
                title="GitHub Profile"
              >
                <GitHubIcon />
                <span>GitHub</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.leetCodeUrl && (
              <a
                href={candidate.leetCodeUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--leetcode"
                title="LeetCode Profile"
              >
                <LeetCodeIcon />
                <span>LeetCode</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.codeforcesUrl && (
              <a
                href={candidate.codeforcesUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--codeforces"
                title="Codeforces Profile"
              >
                <CodeforcesIcon />
                <span>Codeforces</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.hackerRankUrl && (
              <a
                href={candidate.hackerRankUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--hackerrank"
                title="HackerRank Profile"
              >
                <HackerRankIcon />
                <span>HackerRank</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.gitLabUrl && (
              <a
                href={candidate.gitLabUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--gitlab"
                title="GitLab Profile"
              >
                <GitLabIcon />
                <span>GitLab</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
            {candidate.portfolioUrl && (
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-link profile-link--portfolio"
                title="Portfolio Website"
              >
                <Globe size={14} strokeWidth={2} />
                <span>Portfolio</span>
                <ExternalLink size={11} className="profile-link__arrow" />
              </a>
            )}
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-3.5">
        {/* Contact Details & Metadata Grid */}
        <div className="contact-grid">
          <ContactTile
            icon={<Mail size={15} />}
            label="Email"
            value={candidate.email}
            href={`mailto:${candidate.email}`}
            allowCopy
          />
          <ContactTile
            icon={<Phone size={15} />}
            label="Phone"
            value={candidate.phone}
            href={candidate.phone ? `tel:${candidate.phone}` : undefined}
            allowCopy
          />
          <ContactTile
            icon={<MapPin size={15} />}
            label="Location"
            value={candidate.location}
          />
          <ContactTile
            icon={<Briefcase size={15} />}
            label="Relevant Experience"
            value={candidate.relevantExperience}
          />
          <ContactTile
            icon={<UserCheck size={15} />}
            label="Source"
            value={
              candidate.source
                ? candidate.sourceDetail
                  ? `${candidate.source} — ${candidate.sourceDetail}`
                  : candidate.source
                : 'Direct Application'
            }
          />
        </div>

        {/* Technical Skills Section - Always Rendered */}
        <div className="profile-section">
          <div className="profile-section__title">
            <Code2 size={15} className="profile-section__icon text-brand" />
            <span>Technical Skills</span>
            {skillsList.length > 0 && (
              <span className="profile-section__count badge bg-secondary-subtle text-text-soft">
                {skillsList.length}
              </span>
            )}
          </div>
          {skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {skillsList.map((skillName, idx) => (
                <span key={`${skillName}-${idx}`} className={skillColorClass(skillName)}>
                  {skillName}
                </span>
              ))}
            </div>
          ) : (
            <div className="profile-empty-text">No technical skills listed.</div>
          )}
        </div>

        {/* Professional Summary Section - Always Rendered */}
        <div className="profile-section">
          <div className="profile-section__title">
            <FileText size={15} className="profile-section__icon text-brand" />
            <span>Professional Summary</span>
          </div>
          {candidate.summary && candidate.summary.trim() ? (
            <div>
              <div className={`profile-summary${summaryCollapsed ? ' profile-summary--collapsed' : ''}`}>
                {candidate.summary}
              </div>
              {summaryIsLong && (
                <button
                  type="button"
                  className="profile-summary-toggle"
                  onClick={() => setSummaryExpanded((v) => !v)}
                >
                  {summaryExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          ) : (
            <div className="profile-empty-text">No professional summary provided.</div>
          )}
        </div>

        {/* Education & Academics Section - Always Rendered */}
        <div className="profile-section">
          <div className="profile-section__title">
            <GraduationCap size={16} className="profile-section__icon text-brand" />
            <span>Education & Academics</span>
            {candidate.educations && candidate.educations.length > 0 && (
              <span className="profile-section__count badge bg-secondary-subtle text-text-soft">
                {candidate.educations.length}
              </span>
            )}
          </div>
          {candidate.educations && candidate.educations.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1.5">
              {candidate.educations.map((edu, idx) => (
                <div key={edu.id ?? idx} className="education-card">
                  <div className="education-card__header">
                    <div className="flex items-center gap-2 min-w-0">
                      <GraduationCap size={15} className="education-card__icon shrink-0" />
                      <span className="education-card__degree truncate">
                        {edu.degree}
                      </span>
                    </div>
                    {edu.cgpa && (
                      <span className="badge badge-cgpa shrink-0">
                        CGPA {edu.cgpa}
                      </span>
                    )}
                  </div>
                  <div className="education-card__meta">
                    <span className="education-card__institution">{edu.institution}</span>
                    {edu.graduationYear && (
                      <span className="education-card__year">{edu.graduationYear}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-text">No educational qualifications recorded.</div>
          )}
        </div>

        {/* Work & Employment History Section - Always Rendered */}
        <div className="profile-section">
          <div className="profile-section__title">
            <Building2 size={15} className="profile-section__icon text-brand" />
            <span>Work Experience</span>
            {candidate.experiences && candidate.experiences.length > 0 && (
              <span className="profile-section__count badge bg-secondary-subtle text-text-soft">
                {candidate.experiences.length}
              </span>
            )}
          </div>
          {candidate.experiences && candidate.experiences.length > 0 ? (
            <div className="flex flex-col gap-2.5 mt-1.5">
              {candidate.experiences.map((exp, idx) => (
                <div key={exp.id ?? idx} className="experience-card">
                  <div className="experience-card__header">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 size={15} className="experience-card__icon shrink-0" />
                      <span className="experience-card__title truncate">
                        {exp.jobTitle}
                      </span>
                    </div>
                    {exp.duration && (
                      <span className="badge badge-duration shrink-0">
                        {exp.duration}
                      </span>
                    )}
                  </div>
                  <div className="experience-card__company">
                    {exp.company}
                  </div>
                  {exp.description && (
                    <div className="experience-card__desc">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-text">No employment history recorded.</div>
          )}
        </div>

        {/* Referral & Sourcing Section - Always Rendered */}
        <div className="profile-section">
          <div className="profile-section__title">
            <Users size={15} className="profile-section__icon text-brand" />
            <span>Referral & Sourcing</span>
          </div>
          {candidate.isReferred ? (
            <div className="referral-card p-2.5 rounded-[var(--radius-md)] border border-border border-success-subtle bg-success-subtle bg-opacity-10 mt-1">
              <div className="flex items-center gap-2">
                <span className="badge bg-success-subtle text-success-foreground border border-border border-success-subtle">
                  Referred
                </span>
                <span className="font-medium text-foreground text-[length:var(--text-sm)]">
                  {candidate.referenceName || 'Internal Referral'}
                </span>
                {candidate.referenceEmail && (
                  <span className="text-muted-foreground text-[length:var(--text-sm)]">({candidate.referenceEmail})</span>
                )}
                {candidate.referenceEmployeeId && (
                  <span className="badge bg-secondary-subtle text-text-soft text-[length:var(--text-sm)]">
                    ID: {candidate.referenceEmployeeId}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="profile-empty-text">Direct applicant (Not referred).</div>
          )}
        </div>

        {showCvFiles && candidate.cvFiles.length > 0 && (
          <div className="profile-section mt-1">
            <div className="profile-section__title">
              <FileText size={15} className="profile-section__icon text-brand" />
              <span>CV Files</span>
            </div>
            <div className="flex flex-col gap-2 mt-1.5">
              {candidate.cvFiles.map((f) => (
                <div key={f.id} className="cv-file-item">
                  <span className="cv-file-item__icon"><FileText size={18} /></span>
                  <span className="cv-file-item__meta">
                    <span className="cv-file-item__name truncate">{f.originalFileName}</span>
                    <span className="cv-file-item__size">{formatSize(f.fileSizeBytes)}</span>
                  </span>
                  <span className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => void openPreview(f.id, f.originalFileName)}>Preview</Button>
                    <button type="button" className="btn btn-sm btn-cv-download" onClick={() => void downloadCvFile(candidate.id, f.id)}>
                      <DownloadIcon /> Download
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCvFiles && preview && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[length:var(--text-sm)] text-muted-foreground truncate">{previewName}</span>
              <Button size="sm" variant="link" className="p-0" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>Close</Button>
            </div>
            {preview.contentType.includes('pdf') ? (
              <iframe title="CV preview" src={preview.url} className="cv-preview-frame" style={{ width: '100%', height: 480, border: '1px solid var(--bs-border-color)' }} />
            ) : (
              <Alert variant="info" className="mb-0">In-app preview isn't available for this file type. Use Download.</Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
