import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfferMetricsCard from './OfferMetricsCard';
import type { OfferMetrics } from '../../types';

describe('OfferMetricsCard', () => {
  const mockMetrics: OfferMetrics = {
    totalOffers: 12,
    activeOffers: 4,
    acceptedOffers: 7,
    declinedOffers: 1,
    totalHired: 6,
    acceptanceRatePercentage: 87.5,
  };

  it('renders all key offer and hiring conversion statistics', () => {
    render(<OfferMetricsCard metrics={mockMetrics} />);

    expect(screen.getByText(/Offer & Hiring Conversion/i)).toBeInTheDocument();
    expect(screen.getByText('87.5% Acceptance Rate')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/7 Accepted \/ 8 Decided/i)).toBeInTheDocument();
  });
});
