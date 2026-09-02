import { Card, ProgressBar } from 'react-bootstrap';
import { Award, CheckCircle, FileSignature } from 'lucide-react';
import type { OfferMetrics } from '../../types';
import { Badge } from '@/components/ui/badge';

interface OfferMetricsCardProps {
  metrics: OfferMetrics;
}

export default function OfferMetricsCard({ metrics }: OfferMetricsCardProps) {
  return (
    <Card className="rg-card mb-3">
      <Card.Header className="d-flex align-items-center justify-content-between py-2 px-3 bg-transparent">
        <div className="d-flex align-items-center gap-2">
          <FileSignature size={18} className="text-primary" />
          <span className="fw-bold small">Offer & Hiring Conversion</span>
        </div>
        <Badge variant={metrics.acceptanceRatePercentage >= 75 ? 'success' : 'neutral'} className="fw-normal">
          {metrics.acceptanceRatePercentage}% Acceptance Rate
        </Badge>
      </Card.Header>

      <Card.Body className="p-3">
        <div className="grid grid-cols-12 gap-4 text-center mb-3">
          <div className="col-span-12 col-span-6 sm:col-span-3">
            <div className="p-2 border rounded">
              <div className="text-muted small mb-1">Total Offers</div>
              <div className="fs-5 fw-bold text-primary">{metrics.totalOffers}</div>
            </div>
          </div>
          <div className="col-span-12 col-span-6 sm:col-span-3">
            <div className="p-2 border rounded">
              <div className="text-muted small mb-1">Active Offers</div>
              <div className="fs-5 fw-bold text-info">{metrics.activeOffers}</div>
            </div>
          </div>
          <div className="col-span-12 col-span-6 sm:col-span-3">
            <div className="p-2 border rounded">
              <div className="text-muted small mb-1">Accepted</div>
              <div className="fs-5 fw-bold text-success d-flex align-items-center justify-content-center gap-1">
                <CheckCircle size={16} /> {metrics.acceptedOffers}
              </div>
            </div>
          </div>
          <div className="col-span-12 col-span-6 sm:col-span-3">
            <div className="p-2 border rounded">
              <div className="text-muted small mb-1">Total Hired</div>
              <div className="fs-5 fw-bold text-success d-flex align-items-center justify-content-center gap-1">
                <Award size={16} /> {metrics.totalHired}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="d-flex justify-content-between align-items-center small mb-1">
            <span className="text-muted">Offer Acceptance Ratio</span>
            <span className="fw-semibold">
              {metrics.acceptedOffers} Accepted / {metrics.acceptedOffers + metrics.declinedOffers} Decided ({metrics.acceptanceRatePercentage}%)
            </span>
          </div>
          <ProgressBar
            now={metrics.acceptanceRatePercentage}
            
            style={{ height: '8px' }}
          />
        </div>
      </Card.Body>
    </Card>
  );
}
