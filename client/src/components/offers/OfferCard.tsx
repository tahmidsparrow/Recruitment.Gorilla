import { useState } from 'react';
import { Button, Card, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, DollarSign, Download, Edit3, FileText, Plus, Send, XCircle } from 'lucide-react';
import { useToast } from '../ToastStack';
import { useAuth } from '../../auth/AuthContext';
import {
  downloadOfferPdf,
  extendOffer,
  getCandidateOffers,
  reviewOfferApproval,
  submitOfferForApproval,
} from '../../services/api';
import type { CandidateDetail, Offer } from '../../types';
import CreateOfferModal from './CreateOfferModal';
import OfferDecisionModal from './OfferDecisionModal';

interface OfferCardProps {
  candidate: CandidateDetail;
}

export default function OfferCard({ candidate }: OfferCardProps) {
  const { isAdminOrAbove } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [activeDecisionOffer, setActiveDecisionOffer] = useState<Offer | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['candidate-offers', candidate.id],
    queryFn: () => getCandidateOffers(candidate.id),
  });

  const latestOffer = offers.length > 0 ? offers[0] : null;

  const submitApprovalMutation = useMutation({
    mutationFn: (offerId: number) => submitOfferForApproval(candidate.id, offerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidate.id] });
      addToast('Offer submitted for approval', 'info');
    },
    onError: () => addToast('Failed to submit offer for approval', 'danger'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ offerId, decision }: { offerId: number; decision: 'Approved' | 'Rejected' }) =>
      reviewOfferApproval(candidate.id, offerId, { decision }),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidate.id] });
      addToast(`Offer ${vars.decision.toLowerCase()}`, vars.decision === 'Approved' ? 'success' : 'info');
    },
    onError: () => addToast('Failed to record approval decision', 'danger'),
  });

  const extendMutation = useMutation({
    mutationFn: (offerId: number) => extendOffer(candidate.id, offerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidate.id] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      addToast('Offer marked as Extended to candidate!', 'success');
    },
    onError: () => addToast('Failed to extend offer', 'danger'),
  });

  const handleDownloadPdf = async (offer: Offer) => {
    try {
      setIsDownloadingPdf(true);
      const blob = await downloadOfferPdf(candidate.id, offer.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Offer_Letter_${candidate.fullName.replace(/\s+/g, '_')}_#${offer.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Offer letter PDF downloaded', 'success');
    } catch {
      addToast('Failed to generate offer letter PDF', 'danger');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Accepted':
        return 'success';
      case 'Extended':
        return 'primary';
      case 'PendingApproval':
        return 'warning';
      case 'Declined':
      case 'Withdrawn':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className="rg-card mb-3 p-3">
        <div className="d-flex align-items-center gap-2 text-muted small">
          <Spinner size="sm" /> Loading compensation details...
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="rg-card mb-3">
        <Card.Header className="d-flex align-items-center justify-content-between py-2 px-3 bg-transparent">
          <div className="d-flex align-items-center gap-2">
            <DollarSign size={18} className="text-primary" />
            <span className="fw-bold small">Offer & Compensation</span>
            {latestOffer && (
              <Badge bg={getStatusBadgeVariant(latestOffer.status)} className="ms-1 fw-normal">
                {latestOffer.status}
              </Badge>
            )}
          </div>
          <div className="d-flex gap-1">
            {latestOffer ? (
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-1 py-0 px-2"
                onClick={() => {
                  setEditingOffer(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus size={14} /> New Version
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="d-flex align-items-center gap-1 py-0 px-2"
                onClick={() => {
                  setEditingOffer(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus size={14} /> Draft Offer
              </Button>
            )}
          </div>
        </Card.Header>

        <Card.Body className="p-3">
          {!latestOffer ? (
            <div className="text-center py-3 text-muted small">
              <FileText size={28} className="mb-2 opacity-50 d-block mx-auto text-secondary" />
              No employment offer drafted yet for this candidate.
            </div>
          ) : (
            <div>
              <div className="d-flex align-items-baseline justify-content-between mb-2">
                <div>
                  <h6 className="mb-0 fw-bold">{latestOffer.jobTitle}</h6>
                  <span className="text-muted small">Created by {latestOffer.createdByName || 'Recruiter'}</span>
                </div>
                <div className="text-end">
                  <span className="fs-5 fw-bold text-success">
                    {latestOffer.currency} {latestOffer.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted small d-block">/ year</span>
                </div>
              </div>

              <Row className="g-2 my-2 py-2 border-top border-bottom small">
                {latestOffer.bonus && latestOffer.bonus > 0 && (
                  <Col sm={6}>
                    <span className="text-muted">Bonus: </span>
                    <span className="fw-semibold">
                      {latestOffer.currency} {latestOffer.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </Col>
                )}
                {latestOffer.equity && (
                  <Col sm={6}>
                    <span className="text-muted">Equity: </span>
                    <span className="fw-semibold">{latestOffer.equity}</span>
                  </Col>
                )}
                {latestOffer.startDate && (
                  <Col sm={6}>
                    <span className="text-muted">Start Date: </span>
                    <span className="fw-semibold">
                      {new Date(latestOffer.startDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </Col>
                )}
                {latestOffer.expirationDate && (
                  <Col sm={6}>
                    <span className="text-muted">Valid Until: </span>
                    <span className="fw-semibold">
                      {new Date(latestOffer.expirationDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </Col>
                )}
              </Row>

              {latestOffer.notes && (
                <p className="small text-muted mb-3 bg-light dark:bg-dark p-2 rounded">
                  {latestOffer.notes}
                </p>
              )}

              {latestOffer.status === 'Declined' && latestOffer.declineReason && (
                <div className="alert alert-danger py-2 small mb-3">
                  <strong>Decline Reason:</strong> {latestOffer.declineReason}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="d-flex flex-wrap gap-2 justify-content-end pt-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                  disabled={isDownloadingPdf}
                  onClick={() => handleDownloadPdf(latestOffer)}
                >
                  {isDownloadingPdf ? <Spinner size="sm" /> : <Download size={14} />}
                  Download PDF
                </Button>

                {latestOffer.status === 'Draft' && (
                  <>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      onClick={() => {
                        setEditingOffer(latestOffer);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit3 size={14} /> Edit
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      disabled={submitApprovalMutation.isPending}
                      onClick={() => submitApprovalMutation.mutate(latestOffer.id)}
                    >
                      <Send size={14} /> Request Approval
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      disabled={extendMutation.isPending}
                      onClick={() => extendMutation.mutate(latestOffer.id)}
                    >
                      <CheckCircle2 size={14} /> Extend Offer
                    </Button>
                  </>
                )}

                {latestOffer.status === 'PendingApproval' && isAdminOrAbove && (
                  <>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ offerId: latestOffer.id, decision: 'Rejected' })}
                    >
                      <XCircle size={14} /> Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ offerId: latestOffer.id, decision: 'Approved' })}
                    >
                      <CheckCircle2 size={14} /> Approve Offer
                    </Button>
                  </>
                )}

                {latestOffer.status === 'Approved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    disabled={extendMutation.isPending}
                    onClick={() => extendMutation.mutate(latestOffer.id)}
                  >
                    <CheckCircle2 size={14} /> Extend Offer to Candidate
                  </Button>
                )}

                {latestOffer.status === 'Extended' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    onClick={() => {
                      setActiveDecisionOffer(latestOffer);
                      setShowDecisionModal(true);
                    }}
                  >
                    <CheckCircle2 size={14} /> Record Candidate Decision
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <CreateOfferModal
        candidateId={candidate.id}
        existingOffer={editingOffer}
        defaultJobTitle={candidate.roleApplied || candidate.appliedRole}
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setEditingOffer(null);
        }}
      />

      {activeDecisionOffer && (
        <OfferDecisionModal
          candidateId={candidate.id}
          offer={activeDecisionOffer}
          show={showDecisionModal}
          onHide={() => {
            setShowDecisionModal(false);
            setActiveDecisionOffer(null);
          }}
        />
      )}
    </>
  );
}
