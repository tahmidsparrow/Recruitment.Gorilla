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
  confirmVariant?: 'danger' | 'primary';
  pending?: boolean;
  /** Shown inside the dialog, so the failure appears where the action was taken. */
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
        {error && (
          <Alert variant="danger" className="mt-3 mb-0">
            {error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={confirmVariant} disabled={pending} onClick={onConfirm}>
          {pending ? `${confirmLabel.replace(/e$/, '')}ing…` : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
