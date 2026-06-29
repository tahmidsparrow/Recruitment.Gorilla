import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, ProgressBar, Spinner } from 'react-bootstrap';
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
      <div
        {...getRootProps()}
        className={`border border-2 border-dashed rounded p-5 text-center ${
          isDragActive ? 'border-primary bg-light' : 'border-secondary-subtle'
        }`}
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
            <div className="fs-5 mb-1">Drag &amp; drop CVs here, or click to browse</div>
            <div className="text-muted small">PDF or Word (.docx), up to 10&nbsp;MB each</div>
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
