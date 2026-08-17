import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import BulkUploader from '../components/BulkUploader';
import CandidateForm from '../components/CandidateForm';
import Page from '../components/ui/Page';
import SectionCard from '../components/ui/SectionCard';
import type { CVDraft } from '../types';

/**
 * Bulk CV intake: drop files, then review each extracted draft in turn.
 *
 * The page has two modes and now says which one it is in. Previously the drop
 * zone, the queue counter, the review form and the success notice were four
 * unlabelled siblings with no spacing between them, so a full queue read as
 * one undifferentiated block and it was not obvious that the form below the
 * drop zone belonged to the first file of several.
 */
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
    <Page>
      {/* No <h2> — the topbar owns the page title. */}
      <BulkUploader onDraftsParsed={handleParsed} />

      {current && (
        <SectionCard
          title="Review extracted details"
          description={
            queue.length > 1
              ? `Checking what was read from ${current.originalFileName}. ${queue.length - 1} more after this one.`
              : `Checking what was read from ${current.originalFileName}.`
          }
          actions={
            <span className="badge-pill badge-neutral">
              {queue.length} to review
            </span>
          }
        >
          <CandidateForm
            key={current.storedFileName}
            draft={current}
            onSaved={() => advance(true)}
            onCancel={() => advance(false)}
          />
        </SectionCard>
      )}

      {queue.length === 0 && savedCount > 0 && (
        <div className="alert-success-soft d-flex flex-wrap align-items-center gap-3" role="status">
          <span className="d-inline-flex align-items-center gap-2">
            <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
            Saved {savedCount} candidate{savedCount === 1 ? '' : 's'}. Drop more CVs above to
            continue.
          </span>
          <Link to="/candidates" className="btn btn-sm btn-outline-secondary ms-auto">
            View candidates
          </Link>
        </div>
      )}
    </Page>
  );
}
