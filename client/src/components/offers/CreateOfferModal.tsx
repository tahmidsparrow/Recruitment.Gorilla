import { useState, useEffect } from 'react';
import { Button, Form, Modal, Row, Col, InputGroup } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../ToastStack';
import { createOffer, updateOffer } from '../../services/api';
import type { CreateOfferPayload, Offer } from '../../types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'BDT'];

interface CreateOfferModalProps {
  candidateId: number;
  existingOffer?: Offer | null;
  defaultJobTitle?: string | null;
  show: boolean;
  onHide: () => void;
  onSaved?: (offer: Offer) => void;
}

export default function CreateOfferModal({
  candidateId,
  existingOffer,
  defaultJobTitle,
  show,
  onHide,
  onSaved,
}: CreateOfferModalProps) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [jobTitle, setJobTitle] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bonus, setBonus] = useState('');
  const [equity, setEquity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      if (existingOffer) {
        setJobTitle(existingOffer.jobTitle || '');
        setBaseSalary(existingOffer.baseSalary ? String(existingOffer.baseSalary) : '');
        setCurrency(existingOffer.currency || 'USD');
        setBonus(existingOffer.bonus ? String(existingOffer.bonus) : '');
        setEquity(existingOffer.equity || '');
        setStartDate(existingOffer.startDate ? existingOffer.startDate.split('T')[0] : '');
        setExpirationDate(existingOffer.expirationDate ? existingOffer.expirationDate.split('T')[0] : '');
        setNotes(existingOffer.notes || '');
      } else {
        setJobTitle(defaultJobTitle || '');
        setBaseSalary('');
        setCurrency('USD');
        setBonus('');
        setEquity('');
        setStartDate('');
        setExpirationDate('');
        setNotes('');
      }
      setError(null);
    }
  }, [show, existingOffer, defaultJobTitle]);

  const mutation = useMutation({
    mutationFn: async (payload: CreateOfferPayload) => {
      if (existingOffer) {
        return await updateOffer(candidateId, existingOffer.id, payload);
      }
      return await createOffer(candidateId, payload);
    },
    onSuccess: (savedOffer) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      addToast(existingOffer ? 'Offer updated successfully' : 'Offer drafted successfully', 'success');
      onSaved?.(savedOffer);
      onHide();
    },
    onError: (err: any) => {
      const msg = err?.response?.data || 'Failed to save offer. Please check the inputs.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salaryNum = parseFloat(baseSalary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      setError('Please enter a valid base salary greater than zero.');
      return;
    }

    const payload: CreateOfferPayload = {
      jobTitle: jobTitle.trim() || undefined,
      baseSalary: salaryNum,
      currency,
      bonus: bonus ? parseFloat(bonus) : null,
      equity: equity.trim() || null,
      startDate: startDate ? `${startDate}T00:00:00Z` : null,
      expirationDate: expirationDate ? `${expirationDate}T23:59:59Z` : null,
      notes: notes.trim() || null,
    };

    mutation.mutate(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{existingOffer ? 'Edit Offer Terms' : 'Draft New Employment Offer'}</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3">
          {error && <div className="alert alert-danger py-2 mb-3 small">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Job Title / Position</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="e.g. Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Form.Group>

          <Row className="g-2 mb-3">
            <Col sm={8}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Annual Base Salary</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="120000"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Currency</Form.Label>
                <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-2 mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Signing / Annual Bonus (Optional)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 15000"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Equity / Options (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. 10,000 RSUs or 0.25%"
                  value={equity}
                  onChange={(e) => setEquity(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-2 mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Proposed Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Offer Expiration Date</Form.Label>
                <Form.Control
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group>
            <Form.Label className="small fw-semibold">Additional Terms & Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="e.g. Standard benefits package, 4 weeks PTO, hybrid schedule..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : existingOffer ? 'Save Changes' : 'Create Offer'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
