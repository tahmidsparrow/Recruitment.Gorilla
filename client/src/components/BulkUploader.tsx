import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProgressBar } from 'react-bootstrap';
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { uploadCV } from '../services/api';
import { getCVUploadHubConnection, startCVUploadHub, type CVUploadProgressEvent } from '../services/signalr';
import type { CVDraft } from '../types';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface Props {
  onDraftsParsed: (drafts: CVDraft[], batchId?: string) => void;
}

interface FileProgressState {
  fileName: string;
  status: 'queued' | 'parsing' | 'completed' | 'error';
  error?: string | null;
}

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export default function BulkUploader({ onDraftsParsed }: Props) {
  const [batchName, setBatchName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileProgresses, setFileProgresses] = useState<FileProgressState[]>([]);
  const currentBatchId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    startCVUploadHub().then((hub) => {
      if (!active || !hub) return;

      const handleProgress = (event: CVUploadProgressEvent) => {
        if (event.batchId === currentBatchId.current) {
          setFileProgresses((prev) => {
            const next = [...prev];
            if (next[event.fileIndex]) {
              next[event.fileIndex] = {
                fileName: event.fileName,
                status: event.status,
                error: event.error,
              };
            }
            return next;
          });
        }
      };

      hub.on('OnUploadProgress', handleProgress);

      return () => {
        hub.off('OnUploadProgress', handleProgress);
      };
    });

    return () => {
      active = false;
    };
  }, []);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      currentBatchId.current = batchId;

      const hub = getCVUploadHubConnection();
      if (hub.state === 'Connected') {
        try {
          await hub.invoke('JoinBatchGroup', batchId);
        } catch {
          // best-effort join
        }
      }

      setBusy(true);
      setErrors([]);
      setDone(0);
      setTotal(files.length);
      setFileProgresses(
        files.map((f) => ({
          fileName: f.name,
          status: 'queued',
        }))
      );

      const drafts: CVDraft[] = [];
      const failures: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgresses((prev) => {
          const next = [...prev];
          if (next[i]) next[i] = { fileName: file.name, status: 'parsing' };
          return next;
        });

        try {
          const draft = await uploadCV(file, batchId, i, files.length, batchName.trim() || undefined);
          drafts.push(draft);
          setFileProgresses((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { fileName: file.name, status: 'completed' };
            return next;
          });
        } catch (err: any) {
          failures.push(file.name);
          setFileProgresses((prev) => {
            const next = [...prev];
            if (next[i])
              next[i] = {
                fileName: file.name,
                status: 'error',
                error: err?.response?.data || 'Failed to extract file',
              };
            return next;
          });
        } finally {
          setDone((d) => d + 1);
        }
      }

      setErrors(failures);
      setBusy(false);
      if (drafts.length > 0) onDraftsParsed(drafts, batchId);
    },
    [batchName, onDraftsParsed]
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
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-1">
        <div className="d-flex align-items-center gap-2" style={{ maxWidth: 360, width: '100%' }}>
          <label htmlFor="batch-name-input" className="small fw-semibold text-muted text-nowrap">
            Batch Label:
          </label>
          <input
            id="batch-name-input"
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Q3 Senior Engineering Intake"
            value={batchName}
            disabled={busy}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>
      </div>

      <div {...getRootProps()} className={className}>
        <input {...getInputProps()} />
        {busy ? (
          <div className="dropzone__progress" role="status" aria-live="polite">
            <Spinner aria-hidden="true" />
            <div className="empty-state-title">Parsing CVs in background…</div>
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
              PDF or Word (.docx), up to 10&nbsp;MB each. Several at once is fine — real-time
              processing will parse them in the background.
            </div>
          </>
        )}
      </div>

      {busy && fileProgresses.length > 0 && (
        <div className="card p-3 shadow-xs border">
          <div className="small fw-bold text-muted text-uppercase mb-2">Live Parsing Queue</div>
          <div className="d-flex flex-column gap-2">
            {fileProgresses.map((fp, i) => (
              <div
                key={i}
                className="d-flex align-items-center justify-content-between p-2 rounded bg-light border small"
              >
                <div className="d-flex align-items-center gap-2 text-truncate me-2">
                  <FileText size={14} className="text-muted flex-shrink-0" />
                  <span className="fw-semibold text-truncate">{fp.fileName}</span>
                </div>
                <div className="flex-shrink-0">
                  {fp.status === 'queued' && (
                    <span className="badge-pill badge-neutral">Queued</span>
                  )}
                  {fp.status === 'parsing' && (
                    <span className="badge-pill badge-primary d-inline-flex align-items-center gap-1">
                      <Loader2 size={11} className="spinner-border spinner-border-sm" />
                      Parsing
                    </span>
                  )}
                  {fp.status === 'completed' && (
                    <span className="badge-pill badge-success d-inline-flex align-items-center gap-1">
                      <CheckCircle2 size={12} />
                      Extracted
                    </span>
                  )}
                  {fp.status === 'error' && (
                    <span className="badge-pill badge-danger d-inline-flex align-items-center gap-1">
                      <XCircle size={12} />
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="warning" className="mb-0">
          Could not parse {errors.length} file{errors.length === 1 ? '' : 's'}: {errors.join(', ')}
        </Alert>
      )}
    </div>
  );
}
