import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CalendarDays, ChevronLeft, ClipboardList, Printer } from 'lucide-react';
import { getCandidateEvaluationReport } from '../services/api';
import { EvaluationReadOnly } from '../components/EvaluationForm';
import EmptyState from '../components/common/EmptyState';
import Page from '../components/common/Page';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import LoadingPanel from '../components/common/Loading';
import { EVALUATION_SECTIONS, RECOMMENDATIONS } from '../utils/evaluationCriteria';
import { skillColorClass } from '../utils/skillColors';
import type { ReportEvaluation } from '../types';
import { Button } from '@/components/ui/button';

const CRITERION_LABELS: Record<string, string> = Object.fromEntries(
  EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => [c.key, c.label]))
);
// Keep per-criterion rows in the same order as the evaluation form.
const CRITERION_ORDER = EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => c.key));

const recLabel = (value: string) =>
  RECOMMENDATIONS.find((r) => r.value === value)?.label ?? value;

/** Recommendation → glyph-carrying pill, so the outcome isn't colour-alone. */
const recBadgeClass = (value: string): string =>
  value === 'Recommended' ? 'badge-pill badge-success'
    : value === 'Hold' ? 'badge-pill badge-warning'
    : value === 'Reject' ? 'badge-pill badge-danger'
    : 'badge-pill badge-neutral';

/** Small 1–5 dot meter mirroring the evaluation form's RatingDots. */
const RatingDots = ({ rating }: { rating: number | null }) => (
  <span className="rating-dots">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`rating-dot${rating != null && n <= rating ? ' rating-dot--filled' : ''}`} />
    ))}
    <span className="ms-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
      {rating != null ? rating.toFixed(1) : '—'}
    </span>
  </span>
);

export default function CandidateEvaluationReportPage() {
  const { id } = useParams();
  const candidateId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluation-report', candidateId],
    queryFn: () => getCandidateEvaluationReport(candidateId),
    retry: false,
  });

  if (isLoading) {
    return <LoadingPanel label="Loading evaluation report…" />;
  }

  if (error || !data) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <EmptyState
        page
        variant={notFound ? 'empty' : 'error'}
        title={notFound ? "This candidate's report isn't available to you" : 'Failed to load the report'}
        description={
          notFound
            ? 'Recruiters see reports only for candidates under a role they are assigned to.'
            : 'The request failed. Refresh to try again.'
        }
        action={
          <Link to="/candidates" className="btn btn-outline-secondary">
            Back to candidates
          </Link>
        }
      />
    );
  }

  const { summary } = data;

  // Group the flat evaluation list by interview (round), preserving the newest-first order.
  const groups: { interviewId: number; scheduledAt: string; tags: string[]; evals: ReportEvaluation[] }[] = [];
  for (const r of data.evaluations) {
    let g = groups.find((x) => x.interviewId === r.interviewId);
    if (!g) {
      g = { interviewId: r.interviewId, scheduledAt: r.scheduledAt, tags: r.interviewTags, evals: [] };
      groups.push(g);
    }
    g.evals.push(r);
  }

  return (
    <Page className="evaluation-report">
      <Link to={`/candidates/${candidateId}`} className="back-link d-print-none">
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to candidate
      </Link>

      {/* A section heading is right here: the topbar shows "Candidates", and this
          is a sub-page within it. */}
      <PageHeader
        title="Evaluation report"
        description={`${data.fullName}${data.roleApplied ? ` · ${data.roleApplied}` : ''}`}
        actions={
          <Button variant="outline" className="d-print-none" onClick={() => window.print()}>
            <Printer size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="ms-1">Print</span>
          </Button>
        }
      />

      {summary.interviewerCount === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} strokeWidth={1.75} aria-hidden="true" />}
          title="No submitted evaluations yet"
          description="Once an interviewer submits and locks their evaluation, it will appear here."
        />
      ) : (
        <>
          <SectionCard
            title="Summary"
            description={`Across ${summary.interviewerCount} interviewer${summary.interviewerCount === 1 ? '' : 's'}.`}
          >
            <div className="report-summary">
              <div className="page-stack page-stack--tight">
                <div>
                  <span className="field-label">Average overall rating</span>
                  <div className="metric-value">
                    {summary.averageOverall != null ? summary.averageOverall.toFixed(1) : '—'}
                    <small> / 5</small>
                  </div>
                </div>

                <div>
                  <span className="field-label">Recommendations</span>
                  <div className="d-flex flex-wrap gap-2">
                    {summary.recommendationCounts.length === 0 ? (
                      <span className="table-muted">—</span>
                    ) : (
                      summary.recommendationCounts.map((r) => (
                        <span key={r.recommendation} className={recBadgeClass(r.recommendation)}>
                          {recLabel(r.recommendation)}: {r.count}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="field-label">Average by criterion</span>
                <table className="table table-sm mb-0 align-middle">
                  <tbody>
                    {CRITERION_ORDER
                      .map((key) => summary.criterionAverages.find((c) => c.criterionKey === key))
                      .filter((c): c is NonNullable<typeof c> => c != null)
                      .map((c) => (
                        <tr key={c.criterionKey}>
                          <td>{CRITERION_LABELS[c.criterionKey] ?? c.criterionKey}</td>
                          <td className="col-right" style={{ width: 140 }}>
                            <RatingDots rating={c.average} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          {groups.map((g) => (
            <section key={g.interviewId} className="page-stack page-stack--tight">
              <div className="section-head">
                <h3 className="section-title d-inline-flex align-items-center gap-2">
                  <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
                  {new Date(g.scheduledAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </h3>
                {g.tags.length > 0 && (
                  <div className="section-head__actions">
                    {g.tags.map((t) => (
                      <span key={t} className={skillColorClass(t)}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-2">
                {g.evals.map((r) => (
                  <SectionCard
                    key={r.evaluation.id}
                    as="h4"
                    title={r.evaluation.interviewerName}
                    actions={<span className="badge-pill badge-success">Submitted</span>}
                  >
                    <EvaluationReadOnly evaluation={r.evaluation} />
                  </SectionCard>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </Page>
  );
}
