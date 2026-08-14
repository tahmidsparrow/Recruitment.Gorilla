import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useToast } from '../../components/ToastStack';
import { skillColorModifier } from '../../utils/skillColors';
import type { DeleteRoleResult, UpsertOptionPayload } from '../../types';
import type { Opt } from './types';

export interface OptionApi {
  list: (includeInactive: boolean) => Promise<Opt[]>;
  create: (p: UpsertOptionPayload) => Promise<Opt>;
  update: (id: number, p: UpsertOptionPayload) => Promise<Opt>;
  remove: (id: number) => Promise<DeleteRoleResult | void>;
}

/**
 * Skills and interview types are lists of names with an active flag, so they
 * render as tags rather than as the four-column table they used to share with
 * job openings. Adding is an input in the flow of the chips — the common case
 * never opens a modal; clicking a chip's name opens the edit dialog.
 *
 * Colours come from utils/skillColors, so a skill looks the same here as it
 * does on a candidate profile or the interview timeline.
 */
export default function OptionChipsTab({
  noun,
  queryKey,
  api,
  addPlaceholder,
  description,
}: {
  /** Lower-case singular, used in toasts and labels ("skill", "interview type"). */
  noun: string;
  queryKey: string;
  api: OptionApi;
  addPlaceholder: string;
  description: string;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Opt | null>(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editInvalid, setEditInvalid] = useState(false);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['config', queryKey, 'all'],
    queryFn: () => api.list(true),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['config'] });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const createMutation = useMutation({
    mutationFn: (value: string) =>
      api.create({
        name: value,
        // New values go to the end. Nobody types an ordinal any more.
        sortOrder: (options.at(-1)?.sortOrder ?? 0) + 1,
        isActive: true,
      }),
    onSuccess: () => {
      void invalidate();
      setDraft('');
      addToast(`${cap(noun)} added.`);
    },
    onError: () => addToast(`Could not add that ${noun} — the name may already exist.`, 'danger'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.update(editing!.id, {
        name: editName.trim(),
        sortOrder: editing!.sortOrder,
        isActive: editActive,
      }),
    onSuccess: () => {
      void invalidate();
      setEditing(null);
      addToast(`${cap(noun)} updated.`);
    },
    onError: () => addToast(`Could not update that ${noun} — the name may already exist.`, 'danger'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: (result) => {
      void invalidate();
      if (result && 'deactivated' in result && result.deactivated) {
        addToast(
          `That ${noun} is in use by ${result.candidateCount} candidate(s) — it was deactivated instead of deleted.`,
          'warning',
        );
      } else {
        addToast(`${cap(noun)} deleted.`);
      }
    },
    onError: () => addToast(`Could not delete that ${noun}.`, 'danger'),
  });

  const submitDraft = () => {
    const value = draft.trim();
    if (!value || createMutation.isPending) return;
    createMutation.mutate(value);
  };

  const openEdit = (o: Opt) => {
    setEditing(o);
    setEditName(o.name);
    setEditActive(o.isActive);
    setEditInvalid(false);
  };

  return (
    <>
      <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{description}</p>

      {isLoading ? (
        <Spinner animation="border" size="sm" />
      ) : (
        <div className="chip-grid">
          {options.map((o) => (
            <span
              key={o.id}
              className={`option-chip ${skillColorModifier(o.name)}${o.isActive ? '' : ' option-chip--inactive'}`}
              title={o.isActive ? undefined : 'Hidden from candidate forms'}
            >
              <button
                type="button"
                className="option-chip__name"
                onClick={() => openEdit(o)}
                aria-label={`Edit ${o.name}`}
              >
                {o.name}
              </button>
              <button
                type="button"
                className="option-chip__remove"
                onClick={() => removeMutation.mutate(o.id)}
                disabled={removeMutation.isPending}
                aria-label={`Delete ${o.name}`}
                title={`Delete ${o.name}`}
              >
                <X size={13} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </span>
          ))}

          <span className="chip-add">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitDraft(); }
              }}
              placeholder={addPlaceholder}
              aria-label={`Add a ${noun}`}
            />
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={submitDraft}
              disabled={!draft.trim() || createMutation.isPending}
              aria-label={`Add ${noun}`}
              title={`Add ${noun}`}
              style={{ minHeight: 28, padding: '0 8px' }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
            </Button>
          </span>
        </div>
      )}

      {options.length === 0 && !isLoading && (
        <div className="empty-state mt-3">
          <div className="empty-state-title">No {noun} values yet</div>
          <div className="empty-state-description">
            Type one above and press Enter to make it selectable on candidate forms.
          </div>
        </div>
      )}

      <Modal show={editing !== null} onHide={() => setEditing(null)} centered>
        <Form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!editName.trim()) { setEditInvalid(true); return; }
            updateMutation.mutate();
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Edit {noun}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                value={editName}
                onChange={(e) => { setEditName(e.target.value); if (editInvalid) setEditInvalid(false); }}
                isInvalid={editInvalid}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
            </Form.Group>
            <Form.Check
              type="checkbox"
              id={`${queryKey}-active`}
              label="Active — shown in candidate forms"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
