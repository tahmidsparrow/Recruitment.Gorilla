import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Form } from 'react-bootstrap';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Clock,
  Filter,
  Layers,
  Printer,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { getCandidateFilterRoleOptions, getRecruitingAnalytics } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Loading';
import type { AnalyticsFilterParams, RoleAppliedOption } from '../types';

const PRESETS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '1y', label: '1 Year' },
  { id: 'all', label: 'All Time' },
];

export default function AnalyticsPage() {
  const [preset, setPreset] = useState('30d');
  const [roleId, setRoleId] = useState<number | undefined>(undefined);

  // Role filter options
  const { data: roleOptions = [] } = useQuery<RoleAppliedOption[]>({
    queryKey: ['candidates', 'role-filter-options'],
    queryFn: getCandidateFilterRoleOptions,
  });

  // Query analytics data
  const filterParams: AnalyticsFilterParams = useMemo(
    () => ({
      preset,
      roleId,
    }),
    [preset, roleId]
  );

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'summary', filterParams],
    queryFn: () => getRecruitingAnalytics(filterParams),
  });

  const timeToHireChange = summary?.timeToHire?.changeVsPreviousPeriodPercent;

  return (
    <div className="analytics-page">
      {/* Top Filter and Action Bar */}
      <div className="page-bar d-print-none">
        <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1">
          {/* Preset Segmented Control */}
          <div className="segmented" role="group" aria-label="Select date range preset">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                className={preset === p.id ? 'active' : ''}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Job Opening / Role Filter */}
          <div className="d-flex align-items-center gap-1.5" style={{ minWidth: 220 }}>
            <Filter size={14} className="text-muted flex-shrink-0" />
            <Form.Select
              size="sm"
              value={roleId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setRoleId(val ? parseInt(val, 10) : undefined);
              }}
              aria-label="Filter by job opening"
            >
              <option value="">All Job Openings</option>
              {roleOptions.map((r: RoleAppliedOption) => (
                <option key={r.id} value={r.id}>
                  {r.name} {!r.isActive ? '(Inactive)' : ''}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        <div className="page-bar__actions">
          <Button
            variant="outline-secondary"
            className="d-flex align-items-center gap-1.5"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} label="Calculating recruitment analytics" />
      ) : isError || !summary ? (
        <EmptyState
          variant="error"
          title="Could not load recruiting operational analytics"
          description="An error occurred while calculating velocity and funnel metrics."
          action={<Button onClick={() => void refetch()}>Try Again</Button>}
        />
      ) : (
        <>
          {/* KPI Ribbon */}
          <div className="analytics-kpi-grid">
            {/* Avg Time to Hire */}
            <div className="analytics-card analytics-card--kpi">
              <div className="analytics-card__header">
                <h4 className="analytics-card__title">Avg Time to Hire</h4>
                <div className="analytics-card__icon-badge">
                  <Clock size={17} />
                </div>
              </div>
              <p className="analytics-card__value">
                {summary.timeToHire.totalHires > 0
                  ? `${summary.timeToHire.averageDays} days`
                  : '—'}
              </p>
              <div className="analytics-card__subtext">
                {summary.timeToHire.totalHires > 0 ? (
                  <>
                    <span>
                      Fastest: <strong>{summary.timeToHire.fastestDays}d</strong> · Longest:{' '}
                      <strong>{summary.timeToHire.longestDays}d</strong>
                    </span>
                    {timeToHireChange != null && (
                      <span
                        className={`badge-pill ${
                          timeToHireChange <= 0 ? 'badge-success' : 'badge-warning'
                        } d-inline-flex align-items-center gap-0.5 ms-auto`}
                      >
                        {timeToHireChange <= 0 ? (
                          <ArrowDownRight size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}
                        {Math.abs(timeToHireChange)}% vs prior
                      </span>
                    )}
                  </>
                ) : (
                  <span>No hires recorded in this period</span>
                )}
              </div>
            </div>

            {/* Pipeline Velocity */}
            <div className="analytics-card analytics-card--kpi analytics-card--kpi-velocity">
              <div className="analytics-card__header">
                <h4 className="analytics-card__title">Pipeline Velocity</h4>
                <div className="analytics-card__icon-badge analytics-card__icon-badge--velocity">
                  <TrendingUp size={17} />
                </div>
              </div>
              <p className="analytics-card__value">
                {summary.averagePipelineDays > 0
                  ? `${summary.averagePipelineDays} days`
                  : '—'}
              </p>
              <div className="analytics-card__subtext">
                <span>Average dwell time across all active status stages</span>
              </div>
            </div>

            {/* Overall Funnel Conversion */}
            <div className="analytics-card analytics-card--kpi analytics-card--kpi-conversion">
              <div className="analytics-card__header">
                <h4 className="analytics-card__title">Funnel Conversion Rate</h4>
                <div className="analytics-card__icon-badge analytics-card__icon-badge--conversion">
                  <Sparkles size={17} />
                </div>
              </div>
              <div className="analytics-card__value-wrap">
                <p className="analytics-card__value">
                  {summary.overallFunnelConversionRate}%
                </p>
              </div>
              <div className="analytics-card__subtext">
                <span>
                  <strong>{summary.timeToHire.totalHires}</strong> hires from{' '}
                  <strong>{summary.totalCandidatesInPeriod}</strong> applicants
                </span>
              </div>
            </div>

            {/* Active Pipeline Candidates */}
            <div className="analytics-card analytics-card--kpi analytics-card--kpi-pipeline">
              <div className="analytics-card__header">
                <h4 className="analytics-card__title">Active Pipeline</h4>
                <div className="analytics-card__icon-badge analytics-card__icon-badge--pipeline">
                  <Users size={17} />
                </div>
              </div>
              <div className="analytics-card__value-wrap">
                <p className="analytics-card__value">{summary.activeCandidates}</p>
                <span className="analytics-card__unit">in progress</span>
              </div>
              <div className="analytics-card__subtext">
                <span>
                  Candidates advancing through screening, assessments, interviews or offers
                </span>
              </div>
            </div>
          </div>

          {/* Stepped Funnel and Stage Velocity Analysis */}
          <div className="row g-3">
            {/* Stepped Pipeline Funnel */}
            <div className="col-12 col-lg-6">
              <div className="analytics-card h-100">
                <div className="analytics-card__header">
                  <div className="d-flex align-items-center gap-2">
                    <Layers size={18} className="text-primary" />
                    <h5 className="mb-0 fw-bold fs-6">Pipeline Funnel & Conversion</h5>
                  </div>
                  <span className="text-muted small fw-medium">
                    {summary.totalCandidatesInPeriod} applicants entered
                  </span>
                </div>

                <div className="analytics-funnel-list">
                  {summary.funnelStages.map((stage, idx) => {
                    const stageDescriptions: Record<string, string> = {
                      applied: 'Initial ingestion & parsing',
                      screening: 'Reviews & technical assessments',
                      interview: 'Evaluations & scheduled interviews',
                      offer: 'Formal offers extended',
                      hired: 'Accepted placements',
                    };

                    const prevStage = idx > 0 ? summary.funnelStages[idx - 1] : null;
                    const passRate =
                      prevStage && prevStage.totalEntered > 0
                        ? Math.round((stage.totalEntered / prevStage.totalEntered) * 100)
                        : null;

                    return (
                      <div key={stage.stageKey}>
                        {idx > 0 && (
                          <div className="funnel-step-connector">
                            <span className="funnel-step-connector__line" />
                            <span>
                              {passRate != null ? `${passRate}% step pass-through` : '↓'}
                            </span>
                            <span className="funnel-step-connector__line" />
                          </div>
                        )}
                        <div className="funnel-step-item">
                          <div className="funnel-step-item__header">
                            <div className="funnel-step-item__left">
                              <div className="funnel-step-item__badge">{idx + 1}</div>
                              <div>
                                <span className="funnel-step-item__name">
                                  {stage.stageName}
                                </span>
                                {stageDescriptions[stage.stageKey] && (
                                  <span className="funnel-step-item__desc">
                                    · {stageDescriptions[stage.stageKey]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="funnel-step-item__metrics">
                              <span className="funnel-step-item__count">
                                {stage.totalEntered}{' '}
                                <span className="text-muted fw-normal">
                                  {stage.totalEntered === 1 ? 'candidate' : 'candidates'}
                                </span>
                              </span>
                              <span className="badge-pill badge-primary">
                                {stage.conversionFromStartPercent}% from top
                              </span>
                              {idx > 0 && stage.dropoffCount > 0 && (
                                <span className="badge-pill badge-danger">
                                  -{stage.dropoffCount} drop-off
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="funnel-progress-track">
                            <div
                              className="funnel-progress-fill"
                              style={{
                                width: `${Math.max(4, stage.conversionFromStartPercent)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Stage Dwell Time & Velocity Bottlenecks */}
            <div className="col-12 col-lg-6">
              <div className="analytics-card h-100">
                <div className="analytics-card__header">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={18} className="text-primary" />
                    <h5 className="mb-0 fw-bold fs-6">Stage Dwell Time & Velocity</h5>
                  </div>
                  <span className="text-muted small fw-medium">Average days per candidate</span>
                </div>

                {summary.stageVelocities.length === 0 ? (
                  <div className="text-center text-muted py-5 small">
                    No active status transition history available in this period.
                  </div>
                ) : (
                  <div className="velocity-list">
                    {summary.stageVelocities.slice(0, 7).map((v) => {
                      const maxDays = Math.max(
                        ...summary.stageVelocities.map((x) => x.averageDays),
                        1
                      );
                      const pct = Math.round((v.averageDays / maxDays) * 100);
                      const isSlow = v.averageDays > 7.0;
                      const isFast = v.averageDays < 3.0;

                      return (
                        <div
                          key={v.stageName}
                          className={`velocity-row${isSlow ? ' velocity-row--slow' : ''}`}
                        >
                          <span className="velocity-row__name" title={v.stageName}>
                            {v.stageName}
                          </span>
                          <div className="velocity-row__bar-track">
                            <div
                              className={`velocity-row__bar-fill ${
                                isSlow
                                  ? 'velocity-row__bar-fill--slow'
                                  : isFast
                                  ? 'velocity-row__bar-fill--fast'
                                  : 'velocity-row__bar-fill--steady'
                              }`}
                              style={{ width: `${Math.max(6, pct)}%` }}
                            />
                          </div>
                          <div className="velocity-row__value">
                            <span>
                              <strong>{v.averageDays}d</strong>{' '}
                              <span className="text-muted fw-normal small">
                                ({v.candidatesCount})
                              </span>
                            </span>
                            {isSlow && (
                              <span
                                className="badge-pill badge-warning"
                                title="Stage dwell exceeds 7 days threshold"
                              >
                                Bottleneck
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sourcing Channel ROI Table */}
          <div className="analytics-card">
            <div className="analytics-card__header">
              <div className="d-flex align-items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <h5 className="mb-0 fw-bold fs-6">Sourcing Channel Performance & ROI</h5>
              </div>
              <span className="text-muted small fw-medium">
                {summary.sourcingChannels.length} sourcing channels tracked
              </span>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Sourcing Channel</th>
                    <th className="text-center">Applicants</th>
                    <th className="text-center">Screened</th>
                    <th className="text-center">Interviewed</th>
                    <th className="text-center">Offered</th>
                    <th className="text-center">Hires</th>
                    <th className="text-center">Conversion to Hire</th>
                    <th className="text-center">Share of Hires</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sourcingChannels.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No sourcing data found in this period.
                      </td>
                    </tr>
                  ) : (
                    summary.sourcingChannels.map((s) => (
                      <tr key={s.sourceName}>
                        <td className="fw-semibold">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge-pill badge-neutral">
                              {s.sourceName}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">{s.totalApplicants}</td>
                        <td className="text-center">{s.screenedCount}</td>
                        <td className="text-center">{s.interviewedCount}</td>
                        <td className="text-center">{s.offeredCount}</td>
                        <td className="text-center">
                          <strong className={s.hiredCount > 0 ? 'text-success' : ''}>
                            {s.hiredCount}
                          </strong>
                        </td>
                        <td className="text-center">
                          <span className="badge-pill badge-primary">
                            {s.conversionToHirePercent}%
                          </span>
                        </td>
                        <td className="text-center text-muted">
                          {s.shareOfTotalHiresPercent}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recruiter Productivity & Workload Table */}
          <div className="analytics-card">
            <div className="analytics-card__header">
              <div className="d-flex align-items-center gap-2">
                <UserCheck size={18} className="text-primary" />
                <h5 className="mb-0 fw-bold fs-6">Recruiter Productivity & Pipeline Workload</h5>
              </div>
              <span className="text-muted small fw-medium">
                {summary.recruiterWorkloads.length} active recruiters
              </span>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Recruiter</th>
                    <th className="text-center">Active Pipeline</th>
                    <th className="text-center">Total Assigned</th>
                    <th className="text-center">Status Actions</th>
                    <th className="text-center">Interviews Conducted</th>
                    <th className="text-center">Hires Contributed</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recruiterWorkloads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No recruiter workload data recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    summary.recruiterWorkloads.map((r) => (
                      <tr key={r.recruiterUserId}>
                        <td className="fw-semibold">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                              style={{ width: 28, height: 28, fontSize: 11 }}
                            >
                              {r.recruiterName.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{r.recruiterName}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge-pill badge-neutral">
                            {r.activeCandidates} active
                          </span>
                        </td>
                        <td className="text-center">{r.totalAssigned}</td>
                        <td className="text-center">{r.transitionsLogged}</td>
                        <td className="text-center">{r.interviewsParticipated}</td>
                        <td className="text-center">
                          <strong className={r.hiresMade > 0 ? 'text-success' : ''}>
                            {r.hiresMade}
                          </strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
