import { useState } from 'react';
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
      {/* No <h2> — the topbar owns the page title. */}
      <BulkUploader onDraftsParsed={handleParsed} />

      {queue.length > 0 && (
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div className="metric-label">Review queue</div>
          <span className="badge-pill badge-neutral">{queue.length} remaining</span>
        </div>
      )}

      {current && (
        <div className="pulse-card">
          <CandidateForm
            key={current.storedFileName}
            draft={current}
            onSaved={() => advance(true)}
            onCancel={() => advance(false)}
          />
        </div>
      )}

      {queue.length === 0 && savedCount > 0 && (
        <div className="alert-success-soft">
          Saved {savedCount} candidate{savedCount === 1 ? '' : 's'}. Drop more CVs above to continue.
        </div>
      )}
    </div>
  );
}
