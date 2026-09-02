import type { ReactNode } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';

/**
 * Confirmation dialog for a destructive action. Replaces the near-identical
 * delete modal in CandidatesPage, UsersPage and ConfigurationPage.
 *
 * `show` is derived from the caller's "what am I deleting" state rather than a
 * separate boolean, so the two can't drift out of step.
 */
export default function ConfirmModal({
  show,
  title,
  children,
  confirmLabel = 'Delete',
  pendingLabel,
  confirmVariant = 'danger',
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /**
   * The in-flight label. Defaults to a naive "-ing" of `confirmLabel`, which
   * is right for the single-verb labels ("Delete" → "Deleting…") but not for a
   * phrase — "Submit & lock" would become "Submit & locking…". Pass it
   * explicitly whenever the label is more than one word.
   */
  pendingLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  pending?: boolean;
  /** Shown inside the dialog, so the failure appears where the action was taken. */
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const busyLabel = pendingLabel ?? `${confirmLabel.replace(/e$/, '')}ing…`;

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="form-stack">
          <div>{children}</div>
          {error && (
            <Alert variant="danger" className="mb-0">
              {error}
            </Alert>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={confirmVariant} disabled={pending} onClick={onConfirm}>
          {pending ? busyLabel : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
