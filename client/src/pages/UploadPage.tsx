import { useState } from 'react';
import { Alert, Badge, Card } from 'react-bootstrap';
import { useQueryClient } from '@tanstack/react-query';
import BulkUploader from '../components/BulkUploader';
import CandidateForm from '../components/CandidateForm';
import type { CVDraft } from '../types';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<CVDraft[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const handleParsed = (drafts: CVDraft[]) => {
    setQueue((q) => [...q, ...drafts]);
    setSavedCount(0);
  };

  const advance = (saved: boolean) => {
    setQueue((q) => q.slice(1));
    if (saved) {
      setSavedCount((c) => c + 1);
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  };

  const current = queue[0];

  return (
    <div>
      <h2 className="mb-4">Upload CVs</h2>

      <BulkUploader onDraftsParsed={handleParsed} />

      {queue.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-4 mb-2">
          <h4 className="mb-0">Review queue</h4>
          <Badge bg="secondary">{queue.length} remaining</Badge>
        </div>
      )}

      {current && (
        <Card className="mt-2">
          <Card.Body>
            <CandidateForm
              key={current.storedFileName}
              draft={current}
              onSaved={() => advance(true)}
              onCancel={() => advance(false)}
            />
          </Card.Body>
        </Card>
      )}

      {queue.length === 0 && savedCount > 0 && (
        <Alert variant="success" className="mt-4">
          Saved {savedCount} candidate(s). Drop more CVs above to continue.
        </Alert>
      )}
    </div>
  );
}
