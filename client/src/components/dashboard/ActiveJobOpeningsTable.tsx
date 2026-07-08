import { Link } from 'react-router-dom';
import { Card, Table } from 'react-bootstrap';
import type { JobOpening } from '../../types';

const svg = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: 'job-meta-icon',
};

const CalendarIcon = () => (
  <svg {...svg}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const PinIcon = () => (
  <svg {...svg}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PersonIcon = () => (
  <svg {...svg}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const jobId = (id: number) => `JOB-${String(id).padStart(3, '0')}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

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
          <Card.Title as="h6" className="mb-0">
            Active Job Openings
          </Card.Title>
          <Link to="/configuration" className="btn btn-sm btn-outline-secondary">
            View All
          </Link>
        </div>

        {data.length === 0 ? (
          <p className="text-muted mb-0">No active job openings.</p>
        ) : (
          <Table hover responsive className="job-openings-table align-middle mb-0">
            <thead>
              <tr className="text-muted small text-uppercase">
                <th>Job ID</th>
                <th>Date</th>
                <th>Job Title</th>
                <th>Location</th>
                <th>Department</th>
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
