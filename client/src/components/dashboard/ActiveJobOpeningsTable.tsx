import { Link } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import { Briefcase, Calendar, MapPin, User, type LucideProps } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import SectionCard from '../ui/SectionCard';
import type { JobOpening } from '../../types';

const iconProps: LucideProps = {
  size: 15,
  strokeWidth: 1.75,
  'aria-hidden': true,
  className: 'job-meta-icon',
};

const CalendarIcon = () => <Calendar {...iconProps} />;
const PinIcon = () => <MapPin {...iconProps} />;
const PersonIcon = () => <User {...iconProps} />;

const jobId = (id: number) => `JOB-${String(id).padStart(3, '0')}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

/** True when the opening closes within the next 7 days. */
const isClosingSoon = (iso: string): boolean => {
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff < 7 * 24 * 3600 * 1000;
};

const priorityClass = (p: string) => {
  const key = p.toLowerCase();
  return key === 'high' || key === 'medium' || key === 'low' ? `priority--${key}` : 'priority--low';
};
const priorityLabel = (p: string) => (p.toLowerCase() === 'high' ? 'High Priority' : p);

/**
 * Dashboard "Active job openings" — active roles rendered as job postings.
 *
 * `.table-cards` so each row reflows into a labelled card below md rather than
 * forcing a seven-column table through a 360px viewport.
 */
export default function ActiveJobOpeningsTable({ data }: { data: JobOpening[] }) {
  return (
    <SectionCard
      title="Active job openings"
      description="Roles still open for applications, soonest to close first."
      actions={
        <Link to="/configuration" className="btn btn-sm btn-outline-secondary">
          View all
        </Link>
      }
      flush={data.length > 0}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} strokeWidth={1.75} aria-hidden="true" />}
          title="No active job openings"
          description="Openings you add in Configuration show up here until their end date passes."
          action={
            <Link to="/configuration" className="btn btn-primary">
              Add a job opening
            </Link>
          }
        />
      ) : (
        <div className="table-wrap table-wrap--seamless">
          <Table hover className="job-openings-table table-cards align-middle mb-0">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Posted</th>
                <th>Job title</th>
                <th>Location</th>
                <th>Department</th>
                <th>End date</th>
                <th>Applicants</th>
              </tr>
            </thead>
            <tbody>
              {data.map((job) => (
                <tr key={job.id}>
                  <td data-label="Job ID" className="job-id">{jobId(job.id)}</td>
                  <td data-label="Posted" className="text-nowrap">
                    <span className="d-inline-flex align-items-center gap-2">
                      <CalendarIcon />
                      {formatDate(job.postedDate)}
                    </span>
                  </td>
                  <td data-label="Job title">
                    <div className="fw-semibold">{job.title}</div>
                    {job.priority && (
                      <span className={`priority-badge ${priorityClass(job.priority)}`}>
                        {priorityLabel(job.priority)}
                      </span>
                    )}
                  </td>
                  <td data-label="Location">
                    {job.location ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <PinIcon />
                        {job.location}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td data-label="Department" className="text-muted">{job.department ?? '—'}</td>
                  <td data-label="End date" className="text-nowrap">
                    <span className="d-inline-flex align-items-center gap-2">
                      <CalendarIcon />
                      {formatDate(job.endDate)}
                    </span>
                    {isClosingSoon(job.endDate) && (
                      <span className="job-closing-soon">Closing soon</span>
                    )}
                  </td>
                  <td data-label="Applicants">
                    <span className="d-inline-flex align-items-center gap-2">
                      <PersonIcon />
                      {job.applicants.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
