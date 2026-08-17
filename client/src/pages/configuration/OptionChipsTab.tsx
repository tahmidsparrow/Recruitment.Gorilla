import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tags, X } from 'lucide-react';
import { useToast } from '../../components/ToastStack';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import SectionCard from '../../components/ui/SectionCard';
import { Skeleton } from '../../components/ui/Loading';
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
  // The chip's × used to fire the delete straight away. Deleting a skill can
  // deactivate it across every candidate tagged with it, and the chips sit a
  // few pixels apart — an easy misclick with a consequence and no undo.
  const [toDelete, setToDelete] = useState<Opt | null>(null);

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
      setToDelete(null);
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
      <SectionCard title={`${cap(noun)}s`} description={description}>
        {isLoading ? (
          <div className="chip-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} variant="row" width={`${70 + (i % 3) * 30}px`} />
            ))}
          </div>
        ) : (
          <>
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
                    onClick={() => setToDelete(o)}
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
                  className="chip-add__btn"
                >
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
              </span>
            </div>

            {options.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  icon={<Tags size={20} strokeWidth={1.75} aria-hidden="true" />}
                  title={`No ${noun} values yet`}
                  description="Type one above and press Enter to make it selectable on candidate forms."
                />
              </div>
            )}
          </>
        )}
      </SectionCard>

      <ConfirmModal
        show={toDelete !== null}
        title={`Delete ${noun}`}
        pending={removeMutation.isPending}
        error={removeMutation.isError ? `Could not delete that ${noun}.` : undefined}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && removeMutation.mutate(toDelete.id)}
      >
        Delete <strong>{toDelete?.name}</strong>? If any candidate is tagged with it, it is
        deactivated instead — hidden from new forms but kept on existing records.
      </ConfirmModal>

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
            <div className="form-stack">
              <Form.Group>
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
            </div>
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
