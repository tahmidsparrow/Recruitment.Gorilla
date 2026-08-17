import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { UploadCloud } from 'lucide-react';
import { uploadCV } from '../services/api';
import type { CVDraft } from '../types';

interface Props {
  onDraftsParsed: (drafts: CVDraft[]) => void;
}

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export default function BulkUploader({ onDraftsParsed }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setBusy(true);
      setErrors([]);
      setDone(0);
      setTotal(files.length);

      const drafts: CVDraft[] = [];
      const failures: string[] = [];

      for (const file of files) {
        try {
          drafts.push(await uploadCV(file));
        } catch {
          failures.push(file.name);
        } finally {
          setDone((d) => d + 1);
        }
      }

      setErrors(failures);
      setBusy(false);
      if (drafts.length > 0) onDraftsParsed(drafts);
    },
    [onDraftsParsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    disabled: busy,
  });

  const className = [
    'empty-state',
    'dropzone',
    isDragActive && 'dropzone--active',
    busy && 'dropzone--busy',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="page-stack page-stack--tight">
      {/* Reuses .empty-state's dashed treatment so "nothing here yet" and
          "drop something here" read as the same kind of surface. */}
      <div {...getRootProps()} className={className}>
        <input {...getInputProps()} />
        {busy ? (
          <div className="dropzone__progress" role="status" aria-live="polite">
            <Spinner animation="border" size="sm" aria-hidden="true" />
            <div className="empty-state-title">Parsing CVs…</div>
            <div className="empty-state-description">
              {done} of {total} read
            </div>
            <ProgressBar
              className="dropzone__bar"
              now={total ? (done / total) * 100 : 0}
              aria-label={`Parsed ${done} of ${total} files`}
            />
          </div>
        ) : (
          <>
            <span className="empty-state__icon">
              <UploadCloud size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="empty-state-title">Drag &amp; drop CVs here, or click to browse</div>
            <div className="empty-state-description">
              PDF or Word (.docx), up to 10&nbsp;MB each. Several at once is fine — you'll review
              them one by one.
            </div>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <Alert variant="warning" className="mb-0">
          Could not parse {errors.length} file{errors.length === 1 ? '' : 's'}: {errors.join(', ')}
        </Alert>
      )}
    </div>
  );
}
