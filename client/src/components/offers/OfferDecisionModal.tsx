import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../ToastStack';
import { recordOfferDecision } from '../../services/api';
import type { Offer } from '../../types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface OfferDecisionModalProps {
  candidateId: number;
  offer: Offer;
  show: boolean;
  onHide: () => void;
}

export default function OfferDecisionModal({
  candidateId,
  offer,
  show,
  onHide,
}: OfferDecisionModalProps) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [decision, setDecision] = useState<'Accepted' | 'Declined'>('Accepted');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => recordOfferDecision(candidateId, offer.id, { decision, reason: reason.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      addToast(
        decision === 'Accepted'
          ? 'Candidate marked as Offer Accepted!'
          : 'Candidate marked as Offer Declined',
        decision === 'Accepted' ? 'success' : 'info'
      );
      onHide();
    },
    onError: (err: any) => {
      const msg = err?.response?.data || 'Failed to record decision.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'Declined' && !reason.trim()) {
      setError('Please provide a reason when an offer is declined.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Record Candidate Offer Decision</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3">
          {error && <div className="alert alert-danger py-2 mb-3 small">{error}</div>}

          <div className="mb-3">
            <Label className="small fw-semibold">Decision</Label>
            <div className="d-flex gap-3">
              <Form.Check
                type="radio"
                id="dec-accepted"
                name="decision"
                label="Offer Accepted"
                checked={decision === 'Accepted'}
                onChange={() => setDecision('Accepted')}
              />
              <Form.Check
                type="radio"
                id="dec-declined"
                name="decision"
                label="Offer Declined"
                checked={decision === 'Declined'}
                onChange={() => setDecision('Declined')}
              />
            </div>
          </div>

          {decision === 'Declined' && (
            <div className="flex flex-col gap-1.5 mb-3">
              <Label className="small fw-semibold">Decline Reason</Label>
              <Textarea
                rows={3}
                required
                placeholder="e.g. Accepted competing offer, salary expectations, relocation issues..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <p className="small text-muted mb-0">
            {decision === 'Accepted'
              ? 'This will update the candidate status to "Offer Accepted". You can subsequently confirm their start and transition them to "Hired".'
              : 'This will update the candidate status to "Offer Declined" and record the reason in their timeline history.'}
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            
            type="submit"
            disabled={mutation.isPending}
            >
            {mutation.isPending ? 'Recording...' : `Confirm ${decision}`}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
