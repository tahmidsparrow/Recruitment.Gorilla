import { Link } from 'react-router-dom';
import { Card, Col, ListGroup, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../services/api';
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
import PipelineFunnelChart from '../components/dashboard/PipelineFunnelChart';
import StatusDonutChart from '../components/dashboard/StatusDonutChart';
import TrendChart from '../components/dashboard/TrendChart';
import CountBarChart from '../components/dashboard/CountBarChart';
import ActiveJobOpeningsTable from '../components/dashboard/ActiveJobOpeningsTable';
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-danger">Failed to load the dashboard.</p>;
  }

  const { kpis } = data;
  const total = kpis.totalCandidates;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>

      {/* KPI cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="orange"
            icon={<IdCardIcon />}
            label="Total"
            value={total}
            sub="All candidates"
            percent={100}
          />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="teal"
            icon={<HourglassIcon />}
            label="In process"
            value={kpis.inProcess}
            sub="Of total"
            percent={pct(kpis.inProcess)}
          />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="green"
            icon={<PersonCheckIcon />}
            label="Recommended"
            value={kpis.recommended}
            sub="Of total"
            percent={pct(kpis.recommended)}
          />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="red"
            icon={<PersonXIcon />}
            label="Rejected"
            value={kpis.rejected}
            sub="Of total"
            percent={pct(kpis.rejected)}
          />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="blue"
            icon={<CalendarPlusIcon />}
            label="New this week"
            value={kpis.newThisWeek}
            sub="Of total"
            percent={pct(kpis.newThisWeek)}
          />
        </Col>
        <Col xs={6} md={4} xl={2}>
          <KpiCard
            tone="purple"
            icon={<ShareIcon />}
            label="Referred"
            value={kpis.referredCount}
            sub="Of total"
            percent={kpis.referredPercent}
          />
        </Col>
      </Row>

      {/* Pipeline funnel + status donut */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Pipeline stages
              </Card.Title>
              <PipelineFunnelChart data={data.statusBreakdown} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Status breakdown
              </Card.Title>
              <StatusDonutChart data={data.statusBreakdown} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Applications trend */}
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <Card>
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Applications — last 30 days
              </Card.Title>
              <TrendChart data={data.applicationsTrend} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active job openings */}
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <ActiveJobOpeningsTable data={data.activeJobOpenings} />
        </Col>
      </Row>

      {/* By role + top skills */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Candidates by role
              </Card.Title>
              <CountBarChart data={data.byRole} emptyLabel="No roles recorded yet." />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Top skills
              </Card.Title>
              <CountBarChart data={data.topSkills} emptyLabel="No skills recorded yet." />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming interviews + recent activity */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title as="h6" className="text-muted mb-3">
                Upcoming interviews
              </Card.Title>
              {data.upcomingInterviews.length === 0 ? (
                <p className="text-muted mb-0">No interviews scheduled.</p>
              ) : (
                <ListGroup variant="flush">
                  {data.upcomingInterviews.map((i, idx) => (
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
              {data.recentActivity.length === 0 ? (
                <p className="text-muted mb-0">No recent activity.</p>
              ) : (
                <ListGroup variant="flush">
                  {data.recentActivity.map((a, idx) => (
                    <ActivityRow key={`${a.candidateId}-${idx}`} item={a} />
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
