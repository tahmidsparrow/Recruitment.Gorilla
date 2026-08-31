import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import {
  Briefcase,
  Copy,
  FileCheck2,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  cloneEvaluationRubric,
  createEvaluationRubric,
  deleteEvaluationRubric,
  getEvaluationRubrics,
  setDefaultEvaluationRubric,
  updateEvaluationRubric,
} from '../../services/api';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Loading';
import type {
  EvaluationRubric,
  UpsertEvaluationRubricPayload,
  UpsertRubricCriterionPayload,
} from '../../types';

interface SectionDraft {
  id: string;
  name: string;
  criteria: UpsertRubricCriterionPayload[];
}

type FilterType = 'all' | 'active' | 'default';

export default function EvaluationRubricsTab() {
  const queryClient = useQueryClient();

  const { data: rubrics = [], isLoading, isError } = useQuery({
    queryKey: ['evaluation-rubrics'],
    queryFn: getEvaluationRubrics,
  });

  // Filter & Search states
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRubric, setEditingRubric] = useState<EvaluationRubric | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EvaluationRubric | null>(null);

  const openCreateModal = () => {
    setEditingRubric(null);
    setName('');
    setDescription('');
    setIsDefault(rubrics.length === 0);
    setIsActive(true);
    setErrorMsg(null);
    setSections([
      {
        id: 'sec-1',
        name: 'Technical Competency',
        criteria: [
          {
            sectionName: 'Technical Competency',
            key: 'CoreTechnicalKnowledge',
            label: 'Core Technical Knowledge',
            hint: 'Depth of domain knowledge, system architecture and practical implementation experience',
            weight: 1.0,
            sortOrder: 1,
          },
          {
            sectionName: 'Technical Competency',
            key: 'ProblemSolving',
            label: 'Problem Solving & Code Quality',
            hint: 'Ability to dissect complexity, reason about edge cases, and write maintainable code',
            weight: 1.0,
            sortOrder: 2,
          },
        ],
      },
      {
        id: 'sec-2',
        name: 'Communication & Collaboration',
        criteria: [
          {
            sectionName: 'Communication & Collaboration',
            key: 'CommunicationClarity',
            label: 'Communication Clarity',
            hint: 'Ability to articulate ideas effectively, listen attentively, and ask clarifying questions',
            weight: 1.0,
            sortOrder: 3,
          },
          {
            sectionName: 'Communication & Collaboration',
            key: 'CulturalFit',
            label: 'Team Dynamics & Values',
            hint: 'Alignment with team values, receptiveness to feedback, and collaborative mindset',
            weight: 1.0,
            sortOrder: 4,
          },
        ],
      },
    ]);
    setShowModal(true);
  };

  const openEditModal = (rubric: EvaluationRubric) => {
    setEditingRubric(rubric);
    setName(rubric.name);
    setDescription(rubric.description || '');
    setIsDefault(rubric.isDefault);
    setIsActive(rubric.isActive);
    setErrorMsg(null);

    // Group criteria by sectionName
    const sectionMap = new Map<string, UpsertRubricCriterionPayload[]>();
    for (const c of rubric.criteria) {
      const sec = c.sectionName || 'General';
      if (!sectionMap.has(sec)) sectionMap.set(sec, []);
      sectionMap.get(sec)!.push({
        id: c.id,
        sectionName: sec,
        key: c.key,
        label: c.label,
        hint: c.hint || '',
        weight: c.weight,
        sortOrder: c.sortOrder,
      });
    }

    const loadedSections: SectionDraft[] = Array.from(sectionMap.entries()).map(([secName, critList], idx) => ({
      id: `sec-${idx}-${Date.now()}`,
      name: secName,
      criteria: critList,
    }));

    setSections(
      loadedSections.length > 0
        ? loadedSections
        : [
            {
              id: 'sec-1',
              name: 'General',
              criteria: [
                {
                  sectionName: 'General',
                  key: 'Performance',
                  label: 'Overall Performance',
                  hint: '',
                  weight: 1.0,
                  sortOrder: 1,
                },
              ],
            },
          ]
    );
    setShowModal(true);
  };

  // Section manipulation
  const addSection = () => {
    const defaultSecName = `Section ${sections.length + 1}`;
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        name: defaultSecName,
        criteria: [
          {
            sectionName: defaultSecName,
            key: `Criterion_${Date.now()}`,
            label: '',
            hint: '',
            weight: 1.0,
            sortOrder: 1,
          },
        ],
      },
    ]);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      setErrorMsg('A rubric scorecard must have at least one section.');
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const updateSectionName = (sectionId: string, newName: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              name: newName,
              criteria: s.criteria.map((c) => ({ ...c, sectionName: newName })),
            }
          : s
      )
    );
  };

  // Criterion manipulation
  const addCriterion = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const nextSort = s.criteria.length + 1;
        return {
          ...s,
          criteria: [
            ...s.criteria,
            {
              sectionName: s.name,
              key: `Criterion_${Date.now()}`,
              label: '',
              hint: '',
              weight: 1.0,
              sortOrder: nextSort,
            },
          ],
        };
      })
    );
  };

  const removeCriterion = (sectionId: string, index: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          criteria: s.criteria.filter((_, i) => i !== index),
        };
      })
    );
  };

  const updateCriterion = (
    sectionId: string,
    index: number,
    field: keyof UpsertRubricCriterionPayload,
    val: any
  ) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const nextCriteria = [...s.criteria];
        nextCriteria[index] = {
          ...nextCriteria[index],
          [field]: val,
        };
        // Auto generate key slug if user edits label and key is empty or default
        if (field === 'label' && (!nextCriteria[index].key || nextCriteria[index].key.startsWith('Criterion_'))) {
          const slug = String(val)
            .replace(/[^a-zA-Z0-9]/g, '')
            .trim();
          if (slug) nextCriteria[index].key = slug;
        }
        return { ...s, criteria: nextCriteria };
      })
    );
  };

  // Flatten criteria for payload
  const buildPayload = (): UpsertEvaluationRubricPayload | null => {
    if (!name.trim()) {
      setErrorMsg('Rubric scorecard name is required.');
      return null;
    }

    const flatCriteria: UpsertRubricCriterionPayload[] = [];
    const usedKeys = new Set<string>();
    let sort = 1;

    for (const sec of sections) {
      if (!sec.name.trim()) {
        setErrorMsg('All sections must have a title.');
        return null;
      }
      if (sec.criteria.length === 0) {
        setErrorMsg(`Section "${sec.name}" must contain at least one criterion.`);
        return null;
      }
      for (const crit of sec.criteria) {
        if (!crit.label?.trim()) {
          setErrorMsg('All evaluation criteria must have a descriptive label.');
          return null;
        }
        let k = crit.key?.trim();
        if (!k) {
          k = crit.label.replace(/[^a-zA-Z0-9]/g, '').trim() || `Crit${sort}`;
        }
        if (usedKeys.has(k.toLowerCase())) {
          setErrorMsg(`Duplicate criterion identifier "${k}". Each criterion must have a unique key.`);
          return null;
        }
        usedKeys.add(k.toLowerCase());

        flatCriteria.push({
          id: crit.id,
          sectionName: sec.name.trim(),
          key: k,
          label: crit.label.trim(),
          hint: crit.hint?.trim() || null,
          weight: crit.weight && crit.weight > 0 ? Number(crit.weight) : 1.0,
          sortOrder: sort++,
        });
      }
    }

    if (flatCriteria.length === 0) {
      setErrorMsg('At least one criterion is required.');
      return null;
    }

    return {
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
      isActive,
      criteria: flatCriteria,
    };
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: UpsertEvaluationRubricPayload) => {
      if (editingRubric) {
        return updateEvaluationRubric(editingRubric.id, payload);
      }
      return createEvaluationRubric(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluation-rubrics'] });
      void queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setShowModal(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save rubric scorecard.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEvaluationRubric(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluation-rubrics'] });
      setDeleteTarget(null);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: number) => cloneEvaluationRubric(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluation-rubrics'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => setDefaultEvaluationRubric(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluation-rubrics'] });
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const payload = buildPayload();
    if (payload) saveMutation.mutate(payload);
  };

  // Filtered rubrics
  const visibleRubrics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rubrics.filter((r) => {
      if (filter === 'active' && !r.isActive) return false;
      if (filter === 'default' && !r.isDefault) return false;
      if (!q) return true;
      const haystack = [
        r.name,
        r.description,
        ...r.criteria.map((c) => `${c.label} ${c.sectionName} ${c.hint}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rubrics, query, filter]);

  const totalCriteriaInModal = useMemo(
    () => sections.reduce((acc, s) => acc + s.criteria.length, 0),
    [sections]
  );

  return (
    <div className="evaluation-rubrics-tab">
      {/* Search and Action Toolbar */}
      <div className="page-bar">
        <search className="flex-grow-1">
          <div className="data-toolbar">
            <div className="search-field data-toolbar__search">
              <Search size={15} strokeWidth={1.75} aria-hidden="true" className="search-field__icon" />
              <Form.Control
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search scorecards by role, criterion or section…"
                aria-label="Search evaluation rubrics"
              />
            </div>
            <div className="segmented data-toolbar__end" role="group" aria-label="Filter scorecards">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={filter === 'active'}
                className={filter === 'active' ? 'active' : ''}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                type="button"
                aria-pressed={filter === 'default'}
                className={filter === 'default' ? 'active' : ''}
                onClick={() => setFilter('default')}
              >
                Default
              </button>
            </div>
          </div>
        </search>

        <div className="page-bar__actions">
          <Button onClick={openCreateModal} className="d-flex align-items-center gap-1.5">
            <Plus size={15} strokeWidth={2.5} />
            <span>Add rubric scorecard</span>
          </Button>
        </div>
      </div>

      {/* List content */}
      {isLoading ? (
        <SkeletonRows rows={4} label="Loading evaluation rubrics" />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Could not load evaluation rubrics"
          description="The request failed. Please refresh the page to try again."
        />
      ) : visibleRubrics.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 size={24} strokeWidth={1.5} />}
          title={rubrics.length === 0 ? 'No evaluation rubrics yet' : 'No rubrics match your search'}
          description={
            rubrics.length === 0
              ? 'Create custom scorecard rubrics to evaluate candidates with role-specific criteria.'
              : 'Try clearing your search query or switching filters.'
          }
          action={
            rubrics.length === 0 ? (
              <Button onClick={openCreateModal}>Create your first rubric</Button>
            ) : (
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="rubric-list">
          {visibleRubrics.map((r) => (
            <div
              key={r.id}
              className={`rubric-row${r.isDefault ? ' rubric-row--default' : ''}`}
            >
              <div className="rubric-row__main">
                <div className="rubric-row__title-line">
                  <h4 className="rubric-row__name">{r.name}</h4>
                  {r.isDefault && (
                    <span className="badge-pill badge-warning d-inline-flex align-items-center gap-1">
                      <Star size={11} fill="currentColor" /> System Default
                    </span>
                  )}
                  {r.isActive ? (
                    <span className="badge-pill badge-success">Active</span>
                  ) : (
                    <span className="badge-pill badge-neutral">Inactive</span>
                  )}
                </div>

                {r.description && (
                  <p className="rubric-row__description">{r.description}</p>
                )}

                <div className="rubric-row__meta">
                  <span className="rubric-row__meta-item">
                    <FileCheck2 size={13} className="text-muted" />
                    <strong>{r.criteriaCount}</strong> criteria
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="rubric-row__meta-item">
                    <Briefcase size={13} className="text-muted" />
                    <strong>{r.assignedRolesCount}</strong> {r.assignedRolesCount === 1 ? 'linked opening' : 'linked openings'}
                  </span>
                </div>
              </div>

              <div className="rubric-row__actions">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1"
                  onClick={() => openEditModal(r)}
                  aria-label={`Edit ${r.name}`}
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="btn-icon"
                  title="Duplicate scorecard rubric"
                  aria-label={`Duplicate ${r.name}`}
                  onClick={() => cloneMutation.mutate(r.id)}
                  disabled={cloneMutation.isPending}
                >
                  <Copy size={13} />
                </Button>
                {!r.isDefault && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="btn-icon text-warning"
                    title="Designate as system default"
                    aria-label={`Set ${r.name} as default`}
                    onClick={() => setDefaultMutation.mutate(r.id)}
                    disabled={setDefaultMutation.isPending}
                  >
                    <Star size={13} />
                  </Button>
                )}
                {!r.isDefault && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="btn-icon"
                    title="Delete rubric"
                    aria-label={`Delete ${r.name}`}
                    onClick={() => setDeleteTarget(r)}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Scorecard Builder Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={handleFormSubmit}>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="d-flex align-items-center gap-2 fs-5 fw-bold">
              <FileCheck2 size={20} className="text-primary" />
              <span>{editingRubric ? `Edit Scorecard: ${editingRubric.name}` : 'New Evaluation Scorecard Rubric'}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ maxHeight: '72vh', overflowY: 'auto' }} className="p-4">
            {errorMsg && (
              <Alert variant="danger" className="py-2 px-3 mb-3 small d-flex align-items-center gap-2">
                <span>{errorMsg}</span>
              </Alert>
            )}

            <div className="rubric-builder">
              {/* Metadata Card */}
              <div className="rubric-builder__meta-card">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <Form.Label htmlFor="rubric-name" className="fw-semibold small mb-1">
                      Scorecard Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      id="rubric-name"
                      placeholder="e.g. Senior Backend Engineer Scorecard"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4 d-flex flex-column justify-content-center gap-2 pt-md-3">
                    <Form.Check
                      type="switch"
                      id="rubric-is-default"
                      label="System Default"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="small fw-medium"
                    />
                    <Form.Check
                      type="switch"
                      id="rubric-is-active"
                      label="Active"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="small fw-medium"
                    />
                  </div>

                  <div className="col-12">
                    <Form.Label htmlFor="rubric-desc" className="fw-semibold small mb-1">
                      Description <span className="text-muted fw-normal">(Optional)</span>
                    </Form.Label>
                    <Form.Control
                      id="rubric-desc"
                      as="textarea"
                      rows={2}
                      placeholder="Briefly describe the candidate level, role scope, or criteria targets for this scorecard..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sections & Criteria Header */}
              <div className="d-flex align-items-center justify-content-between pt-2">
                <div>
                  <h6 className="mb-0 fw-bold">Evaluation Sections & Criteria</h6>
                  <span className="text-muted small">
                    {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalCriteriaInModal} criteria total
                  </span>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={addSection}
                  className="d-flex align-items-center gap-1"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Section</span>
                </Button>
              </div>

              {/* Section Cards */}
              <div className="d-flex flex-column gap-3">
                {sections.map((sec, secIdx) => (
                  <div key={sec.id} className="rubric-section-card">
                    {/* Section Header */}
                    <div className="rubric-section-card__header">
                      <div className="d-flex align-items-center gap-2 flex-grow-1">
                        <span className="badge bg-primary-subtle text-primary fw-bold font-monospace px-2 py-1">
                          SECTION {secIdx + 1}
                        </span>
                        <Form.Control
                          size="sm"
                          className="fw-bold flex-grow-1"
                          placeholder="Section Title (e.g. Technical Knowledge, Communication)"
                          value={sec.name}
                          onChange={(e) => updateSectionName(sec.id, e.target.value)}
                          style={{ maxWidth: 360 }}
                        />
                      </div>
                      <div className="d-flex align-items-center gap-1.5">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="py-1 px-2.5 d-flex align-items-center gap-1"
                          onClick={() => addCriterion(sec.id)}
                        >
                          <Plus size={13} strokeWidth={2} />
                          <span>Add Criterion</span>
                        </Button>
                        {sections.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="btn-icon text-danger py-1"
                            title="Remove entire section"
                            onClick={() => removeSection(sec.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Criteria Table Body */}
                    <div className="rubric-section-card__body">
                      {/* Column Header for Desktop */}
                      <div className="rubric-criterion-header">
                        <span></span>
                        <span>CRITERION LABEL</span>
                        <span>EVALUATION GUIDE / HINT</span>
                        <span className="text-center">WEIGHT</span>
                        <span></span>
                      </div>

                      {/* Criterion Rows */}
                      {sec.criteria.map((crit, cIdx) => (
                        <div key={`${sec.id}-crit-${cIdx}`} className="rubric-criterion-row">
                          <GripVertical size={14} className="text-muted flex-shrink-0" />
                          <div>
                            <Form.Control
                              size="sm"
                              placeholder="e.g. System Design & Architecture"
                              value={crit.label}
                              onChange={(e) => updateCriterion(sec.id, cIdx, 'label', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Form.Control
                              size="sm"
                              placeholder="What interviewers should look for..."
                              value={crit.hint || ''}
                              onChange={(e) => updateCriterion(sec.id, cIdx, 'hint', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="input-group input-group-sm">
                              <Form.Control
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="10"
                                className="text-center px-1"
                                value={crit.weight ?? 1.0}
                                onChange={(e) =>
                                  updateCriterion(sec.id, cIdx, 'weight', parseFloat(e.target.value) || 1.0)
                                }
                              />
                              <span className="input-group-text px-1.5 text-muted">x</span>
                            </div>
                          </div>
                          <div className="text-end">
                            {sec.criteria.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="btn-icon text-muted hover-danger"
                                title="Remove criterion"
                                onClick={() => removeCriterion(sec.id, cIdx)}
                              >
                                <X size={14} strokeWidth={2.5} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="border-top px-4 py-3">
            <div className="me-auto text-muted small">
              {totalCriteriaInModal} total criteria across {sections.length} sections
            </div>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Rubric Scorecard'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          show={!!deleteTarget}
          title={`Delete Rubric: ${deleteTarget.name}?`}
          confirmLabel="Delete Rubric"
          confirmVariant="danger"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          pending={deleteMutation.isPending}
        >
          Are you sure you want to delete &ldquo;{deleteTarget.name}&rdquo;? Job openings linked to this rubric will automatically revert to the system default.
        </ConfirmModal>
      )}
    </div>
  );
}
