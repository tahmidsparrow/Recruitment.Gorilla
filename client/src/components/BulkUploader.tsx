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

  return (
    <div>
      {/* Reuses .empty-state's dashed treatment so "nothing here yet" and
          "drop something here" read as the same kind of surface. */}
      <div
        {...getRootProps()}
        className={`empty-state dropzone${isDragActive ? ' dropzone--active' : ''}`}
        style={{ cursor: busy ? 'default' : 'pointer' }}
      >
        <input {...getInputProps()} />
        {busy ? (
          <div>
            <Spinner animation="border" size="sm" className="me-2" />
            Parsing CVs… ({done}/{total})
            <ProgressBar
              className="mt-3"
              now={total ? (done / total) * 100 : 0}
              label={`${done}/${total}`}
            />
          </div>
        ) : (
          <div>
            <UploadCloud
              size={28}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: 'var(--muted)', marginBottom: 8 }}
            />
            <div className="empty-state-title">Drag &amp; drop CVs here, or click to browse</div>
            <div className="empty-state-description">PDF or Word (.docx), up to 10&nbsp;MB each</div>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <Alert variant="warning" className="mt-3 mb-0">
          Could not parse {errors.length} file(s): {errors.join(', ')}
        </Alert>
      )}
    </div>
  );
}
