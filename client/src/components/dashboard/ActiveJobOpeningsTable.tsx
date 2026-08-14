import { Link } from 'react-router-dom';
import { Card, Table } from 'react-bootstrap';
import { Calendar, MapPin, User, type LucideProps } from 'lucide-react';
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

/** Dashboard "Active Job Openings" table — active roles rendered as job postings. */
export default function ActiveJobOpeningsTable({ data }: { data: JobOpening[] }) {
  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="metric-label">Active job openings</div>
          <Link to="/configuration" className="btn btn-sm btn-outline-secondary">
            View All
          </Link>
        </div>

        {data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No active job openings</div>
            <div className="empty-state-description">
              Openings you add in Configuration show up here until their end date passes.
            </div>
          </div>
        ) : (
          <Table hover responsive className="job-openings-table align-middle mb-0">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Posted</th>
                <th>Job Title</th>
                <th>Location</th>
                <th>Department</th>
                <th>End date</th>
                <th>Applicants</th>
              </tr>
            </thead>
            <tbody>
              {data.map((job) => (
                <tr key={job.id}>
                  <td className="job-id">{jobId(job.id)}</td>
                  <td className="text-nowrap">
                    <span className="d-inline-flex align-items-center gap-2">
                      <CalendarIcon />
                      {formatDate(job.postedDate)}
                    </span>
                  </td>
                  <td>
                    <div className="fw-medium">{job.title}</div>
                    {job.priority && (
                      <span className={`priority-badge ${priorityClass(job.priority)} mt-1`}>
                        {priorityLabel(job.priority)}
                      </span>
                    )}
                  </td>
                  <td>
                    {job.location ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <PinIcon />
                        {job.location}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-muted">{job.department ?? '—'}</td>
                  <td className="text-nowrap">
                    <span className="d-inline-flex align-items-center gap-2">
                      <CalendarIcon />
                      {formatDate(job.endDate)}
                    </span>
                    {isClosingSoon(job.endDate) && (
                      <span className="job-closing-soon mt-1">Closing soon</span>
                    )}
                  </td>
                  <td>
                    <span className="d-inline-flex align-items-center gap-2">
                      <PersonIcon />
                      {job.applicants.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
