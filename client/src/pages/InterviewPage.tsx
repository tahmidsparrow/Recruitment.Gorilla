import { Link, useParams } from 'react-router-dom';
import { Accordion } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { StickyNote } from 'lucide-react';
import { getInterview, getInterviewEvaluationRubric } from '../services/api';
import ReadOnlyCandidateProfile from '../components/ReadOnlyCandidateProfile';
import EvaluationForm, { EvaluationReadOnly } from '../components/EvaluationForm';
import { skillColorClass } from '../utils/skillColors';
import EmptyState from '../components/ui/EmptyState';
import Page from '../components/ui/Page';
import LoadingPanel from '../components/ui/Loading';
import { initials } from '../utils/initials';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/** Relative label for the scheduled date: Today / Tomorrow / In N days / Completed. */
const relativeLabel = (scheduledAt: string): { label: string; soon: boolean } => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(scheduledAt)) - startOfDay(new Date())) / 86_400_000);
  if (days < 0) return { label: 'Completed', soon: false };
  if (days === 0) return { label: 'Today', soon: true };
  if (days === 1) return { label: 'Tomorrow', soon: true };
  return { label: `In ${days} days`, soon: false };
};

export default function InterviewPage() {
  const { id } = useParams();
  const interviewId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => getInterview(interviewId),
    retry: false,
  });

  const { data: rubric } = useQuery({
    queryKey: ['interview-rubric', interviewId],
    queryFn: () => getInterviewEvaluationRubric(interviewId),
    enabled: !!data,
  });

  if (isLoading) {
    return <LoadingPanel label="Loading interview…" />;
  }

  if (error || !data) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <EmptyState
        page
        // Not an error: being unassigned is a correct, expected outcome, and
        // painting it red would read as "something went wrong".
        variant={notFound ? 'empty' : 'error'}
        title={notFound ? "This interview isn't available to you" : 'Failed to load the interview'}
        description={
          notFound
            ? 'You see an interview only when you are one of its assigned interviewers, or an Admin.'
            : 'The request failed. Refresh the page to try again.'
        }
        action={
          <Link to="/" className="btn btn-outline-secondary">
            Back to dashboard
          </Link>
        }
      />
    );
  }

  // timeZoneName: interviews can span timezones, so the zone is shown rather than implied.
  const scheduled = new Date(data.scheduledAt).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  });
  const relative = relativeLabel(data.scheduledAt);
  const role = data.candidate.roleApplied ?? data.candidate.appliedRole;
  const otherEvaluations = (data.allEvaluations ?? []).filter(
    (e) => e.interviewerUserId !== data.myEvaluation?.interviewerUserId
  );

  /** The recruiter's brief, rendered inside whichever card leads the column. */
  const briefing = data.notes ? (
    <div className="eval-briefing">
      <div className="eval-briefing__label">
        <StickyNote size={13} strokeWidth={1.75} aria-hidden="true" />
        Notes from the recruiter
      </div>
      <div className="eval-briefing__body">{data.notes}</div>
    </div>
  ) : null;

  return (
    <Page>
      <div className="interview-hero anim-fade-up">
        <div className="interview-hero__top">
          <div className="profile-avatar">{initials(data.candidate.fullName) || '?'}</div>
          <div className="interview-hero__identity">
            {/* No "Interview" eyebrow — the topbar directly above already says
                it. The name is the heading; the role and the interview's type
                tags are one meta line rather than a three-deep stack. */}
            <h2>{data.candidate.fullName}</h2>
            <div className="interview-hero__meta">
              {role && <span className="form-help">{role}</span>}
              {data.interviewTags.map((tag) => (
                <span key={tag} className={skillColorClass(tag)}>{tag}</span>
              ))}
            </div>
          </div>
          {/* The schedule and the interviewers are one right-hand cluster.
              They used to be two rows — the chip here and a full-width
              "INTERVIEWERS" strip below a divider — which spent a third of the
              hero's height on what is usually one avatar pill. */}
          <div className="interview-hero__aside">
            <span className={`interview-chip${relative.soon ? ' interview-chip--soon' : ''}`}>
              <CalendarIcon /> {scheduled} · {data.durationMinutes} min · {relative.label}
            </span>
            <div className="interview-hero__people">
              {/* Inline, not a row of its own — the pills are meaningless
                  without it, but it doesn't warrant its own band either. */}
              <span className="field-label interview-hero__people-label">
                {data.interviewers.length === 1 ? 'Interviewer' : 'Interviewers'}
              </span>
              {data.interviewers.map((i) => (
                <span key={i.userId} className="interviewer-pill" title={i.name}>
                  <span className="interviewer-pill__avatar">{initials(i.name) || '?'}</span>
                  {i.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --panels gives both columns one shared height so their bottoms line
          up; .interview-grid overrides that height to exactly the viewport
          below the topbar and pins the columns, so the profile scrolls on the
          left and the rubric on the right without the page moving. */}
      <div className="detail-grid detail-grid--panels interview-grid">
        <div className="card-stack anim-fade-up" style={{ animationDelay: '60ms' }}>
          <ReadOnlyCandidateProfile candidate={data.candidate} className="detail-scroll" />
        </div>

        {/* The evaluation column sticks below the topbar and is sized to the
            remaining viewport, so the rubric is always the thing on screen
            while the candidate profile scrolls past it on the left. */}
        <div className="card-stack interview-grid__eval anim-fade-up" style={{ animationDelay: '120ms' }}>
          {/* The briefing is folded into the evaluation card itself rather than
              floating above it as a second card: it is instructions *for this
              form*, it belongs to the same object, and as its own card it cost
              a whole surface plus a gap to show one line. Inside the card it
              also sits outside the scrolling rubric, so it stays readable the
              whole way down the twelve criteria. */}
          {data.canEvaluate ? (
            <EvaluationForm
              interviewId={interviewId}
              evaluation={data.myEvaluation}
              briefing={briefing}
            />
          ) : (
            <div className="pulse-card">
              {briefing}
              <div className="alert-info-soft">
                You are viewing this interview but are not an assigned interviewer.
              </div>
            </div>
          )}

          {data.allEvaluations && otherEvaluations.length > 0 && (
            <Accordion>
              <Accordion.Item eventKey="others">
                <Accordion.Header>Other interviewers' evaluations ({otherEvaluations.length})</Accordion.Header>
                <Accordion.Body>
                  <div className="card-stack">
                    {otherEvaluations.map((e) => (
                      <div key={e.id}>
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                          <strong>{e.interviewerName}</strong>
                          <span className={`badge-pill ${e.isSubmitted ? 'badge-success' : 'badge-neutral'}`}>
                            {e.isSubmitted ? 'Submitted' : 'Draft'}
                          </span>
                        </div>
                        <EvaluationReadOnly evaluation={e} rubric={rubric} />
                      </div>
                    ))}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}
        </div>
      </div>
    </Page>
  );
}
