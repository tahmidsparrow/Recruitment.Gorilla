import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, ListGroup, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import {
  getApplicationsTrend,
  getDashboard,
  getDashboardKpis,
  getJobOpenings,
  getStatusBreakdown,
} from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import KpiCard from '../components/dashboard/KpiCard';
import {
  IdCardIcon,
  HourglassIcon,
  PersonCheckIcon,
  PersonXIcon,
  CalendarPlusIcon,
  ShareIcon,
} from '../components/dashboard/kpiIcons';
import StatusDonutChart from '../components/dashboard/StatusDonutChart';
import TrendChart from '../components/dashboard/TrendChart';
import CountBarChart from '../components/dashboard/CountBarChart';
import ActiveJobOpeningsTable from '../components/dashboard/ActiveJobOpeningsTable';
import MyInterviewsCard from '../components/dashboard/MyInterviewsCard';
import DashboardHero from '../components/dashboard/DashboardHero';
import { useAuth } from '../auth/AuthContext';
import type { ActivityItem, UpcomingInterview } from '../types';

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const isSoon = (iso: string): boolean => new Date(iso).getTime() - Date.now() < 24 * 3600 * 1000;

const TREND_RANGES = [7, 30, 90] as const;

function InterviewRow({ item }: { item: UpcomingInterview }) {
  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-center gap-2">
      <div className="min-w-0">
        <Link to={`/candidates/${item.candidateId}`} className="fw-medium text-decoration-none">
          {item.fullName}
        </Link>
        <div className="text-muted small text-truncate">{item.role ?? '—'}</div>
      </div>
      <div className="text-end flex-shrink-0">
        <div className={`small ${isSoon(item.interviewAt) ? 'text-danger fw-semibold' : ''}`}>
          {new Date(item.interviewAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <StatusBadge status={item.currentStatus} className="mt-1" />
      </div>
    </ListGroup.Item>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-center gap-2">
      <div className="min-w-0">
        <Link to={`/candidates/${item.candidateId}`} className="fw-medium text-decoration-none">
          {item.fullName}
        </Link>{' '}
        <StatusBadge status={item.status} />
        <div className="text-muted small text-truncate">by {item.changedBy}</div>
      </div>
      <span className="text-muted small flex-shrink-0">{relativeTime(item.changedAt)}</span>
    </ListGroup.Item>
  );
}

export default function DashboardPage() {
  const { canWriteCandidates } = useAuth();
  const [trendDays, setTrendDays] = useState<number>(30);

  // Org-wide figures — every role sees the same numbers.
  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: getDashboardKpis,
  });
  const { data: statusBreakdown = [] } = useQuery({
    queryKey: ['dashboard', 'status-breakdown'],
    queryFn: getStatusBreakdown,
  });
  const { data: trend = [] } = useQuery({
    queryKey: ['dashboard', 'trend', trendDays],
    queryFn: () => getApplicationsTrend(trendDays),
  });
  const { data: jobOpenings = [] } = useQuery({
    queryKey: ['dashboard', 'job-openings'],
    queryFn: getJobOpenings,
  });

  // Owner-scoped, candidate-centric sections — only for roles that manage candidates.
  const { data: scoped } = useQuery({
    queryKey: ['dashboard', 'scoped'],
    queryFn: getDashboard,
    enabled: canWriteCandidates,
  });

  if (kpisLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  if (kpisError || !kpis) {
    return <p className="text-danger">Failed to load the dashboard.</p>;
  }

  const total = kpis.totalCandidates;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <div>
      <DashboardHero inProcessCount={kpis.inProcess} />

      {/* KPI cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="orange" icon={<IdCardIcon />} label="Total" value={total} sub="All candidates" percent={100} />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="teal" icon={<HourglassIcon />} label="In process" value={kpis.inProcess} sub="Of total" percent={pct(kpis.inProcess)} />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="green" icon={<PersonCheckIcon />} label="Recommended" value={kpis.recommended} sub="Of total" percent={pct(kpis.recommended)} />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="red" icon={<PersonXIcon />} label="Rejected" value={kpis.rejected} sub="Of total" percent={pct(kpis.rejected)} />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="blue" icon={<CalendarPlusIcon />} label="New this week" value={kpis.newThisWeek} sub="Of total" percent={pct(kpis.newThisWeek)} />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard tone="purple" icon={<ShareIcon />} label="Referred" value={kpis.referredCount} sub="Of total" percent={kpis.referredPercent} />
        </Col>
      </Row>

      {/* My interviews (personal) */}
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <MyInterviewsCard />
        </Col>
      </Row>

      {/* Status breakdown + applications trend */}
      <Row className="g-3 mb-4">
        <Col lg={5}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Status breakdown
              </Card.Title>
              <StatusDonutChart data={statusBreakdown} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title as="h6" className="text-muted mb-0">
                  Applications — last {trendDays} days
                </Card.Title>
                <div className="btn-group btn-group-sm" role="group" aria-label="Trend range">
                  {TREND_RANGES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn ${trendDays === d ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setTrendDays(d)}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart data={trend} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active job openings */}
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <ActiveJobOpeningsTable data={jobOpenings} />
        </Col>
      </Row>

      {/* Candidate-centric sections — only for candidate-managing roles */}
      {canWriteCandidates && (
        <>
          <Row className="g-3 mb-4">
            <Col lg={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title as="h6" className="text-muted mb-3">
                    Candidates by role
                  </Card.Title>
                  <CountBarChart data={scoped?.byRole ?? []} emptyLabel="No roles recorded yet." />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title as="h6" className="text-muted mb-3">
                    Top skills
                  </Card.Title>
                  <CountBarChart data={scoped?.topSkills ?? []} emptyLabel="No skills recorded yet." />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title as="h6" className="text-muted mb-3">
                    Upcoming interviews
                  </Card.Title>
                  {(scoped?.upcomingInterviews ?? []).length === 0 ? (
                    <p className="text-muted mb-0">No interviews scheduled.</p>
                  ) : (
                    <ListGroup variant="flush">
                      {scoped!.upcomingInterviews.map((i, idx) => (
                        <InterviewRow key={`${i.candidateId}-${idx}`} item={i} />
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title as="h6" className="text-muted mb-3">
                    Recent activity
                  </Card.Title>
                  {(scoped?.recentActivity ?? []).length === 0 ? (
                    <p className="text-muted mb-0">No recent activity.</p>
                  ) : (
                    <ListGroup variant="flush">
                      {scoped!.recentActivity.map((a, idx) => (
                        <ActivityRow key={`${a.candidateId}-${idx}`} item={a} />
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
