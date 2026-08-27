import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteCandidate,
  downloadCvFile,
  getActiveRoleOptions,
  getActiveSkillOptions,
  getActiveSourceOptions,
  getCandidate,
  previewCvFile,
  updateCandidate,
} from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import ReadOnlyCandidateProfile from '../components/ReadOnlyCandidateProfile';
import AddStatusModal from '../components/AddStatusModal';
import { SearchableSelect, SearchableMultiSelect } from '../components/SearchableSelect';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/ToastStack';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import Page from '../components/ui/Page';
import SectionCard from '../components/ui/SectionCard';
import LoadingPanel from '../components/ui/Loading';
import OfferCard from '../components/offers/OfferCard';
import { useAuth } from '../auth/AuthContext';
// The role-filter branch added a local copy of this; develop had already
// extracted the same function to utils, so use the shared one.
import { initials } from '../utils/initials';
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
  const { canWriteCandidates, isAdminOrAbove } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingStatus, setAddingStatus] = useState(false);

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

  if (isLoading) return <LoadingPanel label="Loading candidate…" />;
  if (isError || !data) {
    return (
      <EmptyState
        page
        variant="error"
        title="Couldn't load this candidate"
        description="The record may have been deleted, or the request failed."
        action={
          <Link to="/candidates" className="btn btn-outline-secondary">
            Back to candidates
          </Link>
        }
      />
    );
  }

  const role = data.roleApplied ?? data.appliedRole;
  const canWrite = canWriteCandidates && !data.roleClosed;

  return (
    <Page>
      {/* Kept as a link with this exact text — e2e/smoke.spec.ts navigates by it. */}
      <Link to="/candidates" className="back-link">
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to candidates
      </Link>

      {/* Prism's flat page header, carrying the actions the role-filter branch
          added (explicit Edit, evaluation report) rather than its gradient hero. */}
      <div className="page-header">
        <div className="who-cell">
          <span className="avatar avatar--lg" aria-hidden="true">{initials(data.fullName) || '?'}</span>
          <div className="min-w-0">
            <h2>{data.fullName}</h2>
            <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
              <StatusBadge status={data.currentStatus} />
              {role && <span className="form-help">{role}</span>}
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          {canWrite && !editing && (
            <Button onClick={() => setEditing(true)}>
              <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="ms-1">Edit</span>
            </Button>
          )}
          <Link to={`/candidates/${candidateId}/evaluations`} className="btn btn-outline-secondary">
            <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="ms-1">Evaluation report</span>
          </Link>
          {isAdminOrAbove && (
            <Button variant="outline-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="ms-1">Delete candidate</span>
            </Button>
          )}
        </div>
      </div>

      {data.roleClosed && (
        <div className="alert-warning-soft">
          <strong>Job opening closed.</strong> This candidate's applied-for role ended
          {data.roleEndDate ? ` on ${new Date(data.roleEndDate).toLocaleString()}` : ''}. Profile
          edits and status changes are locked until an Admin extends the role's End Date in
          Configuration.
        </div>
      )}

      <ConfirmModal
        show={confirmDelete}
        title="Delete candidate"
        pending={deleteMutation.isPending}
        error={deleteMutation.isError ? 'Delete failed. Please try again.' : undefined}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      >
        Permanently delete <strong>{data.fullName}</strong>, along with their CV file(s) and full
        status history? This cannot be undone.
      </ConfirmModal>

      {/* The read/edit split comes from the role-filter branch — the form is no
          longer permanently open — rendered on Prism's flat cards. Editing is a
          single narrow column: a form is read top-to-bottom, and the status
          panel beside it is not actionable mid-edit. */}
      {editing ? (
        <div className="detail-edit-column">
          <SectionCard
            title="Edit profile"
            description="Changes are saved to the candidate record and the audit trail."
          >
            <ProfileEditor
              candidate={data}
              onSaved={() => {
                void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
                void queryClient.invalidateQueries({ queryKey: ['candidates'] });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </SectionCard>

          <CvFilesCard candidateId={candidateId} files={data.cvFiles} />
        </div>
      ) : (
        /* --panels: the two columns share one bounded height and scroll their
           own overflow, rather than the longer one (usually the timeline)
           stretching the page and leaving the profile stranded beside a column
           of whitespace. Only this page opts in — the interview page uses a
           bare .detail-grid, where the evaluation form must grow freely. */
        <div className="detail-grid detail-grid--panels">
          <div className="card-stack">
            {/* showCvFiles={false}: CvFilesCard below is the CV surface for
                this page, and rendering both listed every file twice. */}
            <ReadOnlyCandidateProfile candidate={data} showCvFiles={false} />
            {canWrite && <OfferCard candidate={data} />}
            <CvFilesCard candidateId={candidateId} files={data.cvFiles} />
          </div>

          <div className="card-stack">
            {/* Advancing the pipeline is a deliberate, occasional act, so it is
                a dialog rather than a form sitting permanently open above the
                timeline — which pushed the history (the thing you came to read)
                down the page on every visit, and grew to five fields when
                "Interview Scheduled" was picked. The trigger lives on the
                history card because that is what it changes. */}
            <SectionCard
              title="Status history"
              className="detail-scroll"
              actions={
                canWrite ? (
                  <Button size="sm" onClick={() => setAddingStatus(true)}>
                    <Plus size={14} strokeWidth={2} aria-hidden="true" />
                    <span className="ms-1">Add status</span>
                  </Button>
                ) : undefined
              }
            >
              <StatusTimeline history={data.statusHistory} canViewEvaluations={isAdminOrAbove} />
            </SectionCard>
          </div>
        </div>
      )}

      {canWrite && (
        <AddStatusModal
          candidateId={candidateId}
          show={addingStatus}
          onHide={() => setAddingStatus(false)}
          onAdded={() => {
            setAddingStatus(false);
            void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
          }}
        />
      )}
    </Page>
  );
}

type ProfileFieldErrors = Partial<Record<'fullName' | 'email' | 'roleApplied' | 'relevantExperience' | 'referenceName' | 'referenceEmail', string>>;

function ProfileEditor({
  candidate,
  onSaved,
  onCancel,
}: {
  candidate: CandidateDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { addToast } = useToast();
  const [form, setForm] = useState(candidate);
  const [skillIds, setSkillIds] = useState<number[]>(candidate.skillOptions.map((s) => s.id));
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  useEffect(() => {
    setForm(candidate);
    setSkillIds(candidate.skillOptions.map((s) => s.id));
  }, [candidate]);

  const handleCancel = () => {
    setForm(candidate);
    setSkillIds(candidate.skillOptions.map((s) => s.id));
    setFieldErrors({});
    onCancel();
  };

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['role-options', 'active'],
    queryFn: getActiveRoleOptions,
  });
  const { data: skillOptions = [] } = useQuery({
    queryKey: ['skill-options', 'active'],
    queryFn: getActiveSkillOptions,
  });
  const { data: sourceOptions = [] } = useQuery({
    queryKey: ['source-options', 'active'],
    queryFn: getActiveSourceOptions,
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
        sourceOptionId: form.sourceOptionId,
        sourceDetail: form.sourceDetail || null,
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
      <fieldset className="border-0 p-0 m-0">
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
        <Col md={6}>
          <Form.Label>Source</Form.Label>
          <SearchableSelect
            options={sourceOptions}
            value={form.sourceOptionId}
            onChange={(sourceOptionId) => setForm((f) => ({ ...f, sourceOptionId }))}
            placeholder="Where did this candidate come from?"
          />
        </Col>
        <Col md={6}>
          <Form.Label>Source detail</Form.Label>
          <Form.Control
            value={form.sourceDetail ?? ''}
            onChange={(e) => set('sourceDetail', e.target.value)}
            placeholder="Agency, campaign or board name"
          />
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

      <div className="form-actions">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="outline-secondary" type="button" disabled={mutation.isPending} onClick={handleCancel}>
          Cancel
        </Button>
      </div>
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
    <SectionCard title="CV files">
      <div className="page-stack page-stack--tight">
        {files.length === 0 ? (
          <EmptyState
            icon={<FileText size={20} strokeWidth={1.75} aria-hidden="true" />}
            title="No CV on file"
            description="Files uploaded for this candidate will be listed here."
          />
        ) : (
          <div>
            {files.map((f) => (
              <div key={f.id} className="cv-file-item">
                <span className="cv-file-item__icon">
                  <FileText size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="cv-file-item__meta">
                  <span className="cv-file-item__name text-truncate">{f.originalFileName}</span>
                  <span className="cv-file-item__size">
                    {f.fileType} · {formatSize(f.fileSizeBytes)}
                  </span>
                </span>
                <span className="row-actions">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={loadingId === f.id}
                    onClick={() => openPreview(f.id)}
                  >
                    {loadingId === f.id ? 'Loading…' : 'Preview'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => downloadCvFile(candidateId, f.id)}
                  >
                    Download
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert-danger-soft" role="alert">{error}</div>}

        {preview &&
          (isPdf ? (
            <iframe title="CV preview" src={preview.url} className="cv-preview-frame" />
          ) : (
            <div className="alert-info-soft">
              In-app preview isn't available for this file type. Use Download to open it.
            </div>
          ))}
      </div>
    </SectionCard>
  );
}

