import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  UserCheck,
  CheckSquare,
  Square,
  Globe,
  Clock,
  Sparkles,
  Copy,
  Briefcase,
  Mail,
  Phone,
} from 'lucide-react';
import {
  getCandidateDrafts,
  getCandidateDraft,
  getDraftBatches,
  updateCandidateDraft,
  approveCandidateDraft,
  bulkApproveCandidateDrafts,
  discardCandidateDraft,
  bulkDiscardCandidateDrafts,
  getActiveRoleOptions,
  getActiveSourceOptions,
} from '../../services/api';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../ToastStack';
import { initials } from '../../utils/initials';
import EmptyState from '../common/EmptyState';
import LoadingPanel from '../common/Loading';
import type {
  CandidateDraft,
  ApproveCandidateDraftRequest,
  UpdateCandidateDraftRequest,
} from '../../types';

interface Props {
  initialBatchId?: string | null;
  onCandidateCreated?: () => void;
}

const EXPERIENCE_PRESETS = ['< 1 Year', '1-2 Years', '3-5 Years', '5-8 Years', '8+ Years'];

export default function DraftReviewWorkspace({ initialBatchId, onCandidateCreated }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [batchFilter, setBatchFilter] = useState<string>(initialBatchId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

  // Multi-select state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState<number | null>(null);

  // Form editing state for currently loaded draft
  const [editForm, setEditForm] = useState<Partial<CandidateDraft>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync initialBatchId when provided
  useEffect(() => {
    if (initialBatchId) {
      setBatchFilter(initialBatchId);
    }
  }, [initialBatchId]);

  // Queries
  const { data: batches = [], refetch: refetchBatches } = useQuery({
    queryKey: ['draft-batches'],
    queryFn: getDraftBatches,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['role-options', 'active'],
    queryFn: getActiveRoleOptions,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['source-options', 'active'],
    queryFn: getActiveSourceOptions,
  });

  const {
    data: draftsDataPage,
    isLoading: isLoadingDrafts,
    refetch: refetchDrafts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['candidate-drafts', statusFilter, batchFilter, searchQuery],
    queryFn: ({ pageParam }) =>
      getCandidateDrafts({
        status: statusFilter,
        batchId: batchFilter || undefined,
        search: searchQuery || undefined,
        pageSize: 50,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });

  const drafts = useMemo(() => draftsDataPage?.pages.flatMap((page) => page.items) ?? [], [draftsDataPage]);
  const draftsData = draftsDataPage?.pages[0];

  // Auto-select first draft if none selected or if selected is not in current list
  useEffect(() => {
    if (drafts.length > 0) {
      if (!selectedDraftId || !drafts.some((d) => d.id === selectedDraftId)) {
        setSelectedDraftId(drafts[0].id);
      }
    } else {
      setSelectedDraftId(null);
    }
  }, [drafts, selectedDraftId]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // Fetch full details of the currently selected draft
  const { data: activeDraft, isLoading: isLoadingActiveDraft } = useQuery({
    queryKey: ['candidate-draft', selectedDraftId],
    queryFn: () => (selectedDraftId ? getCandidateDraft(selectedDraftId) : null),
    enabled: selectedDraftId !== null,
  });

  // Populate edit form when active draft changes
  useEffect(() => {
    if (activeDraft) {
      const defaultName =
        activeDraft.fullName?.trim() ||
        activeDraft.originalFileName
          .replace(/\.[^/.]+$/, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');

      setEditForm({
        fullName: defaultName,
        email: activeDraft.email || '',
        phone: activeDraft.phone || '',
        currentTitle: activeDraft.currentTitle || '',
        relevantExperience: activeDraft.relevantExperience || '3-5 Years',
        skills: activeDraft.skills || '',
        summary: activeDraft.summary || '',
        linkedInUrl: activeDraft.linkedInUrl || '',
        githubUrl: activeDraft.githubUrl || '',
        portfolioUrl: activeDraft.portfolioUrl || '',
        location: activeDraft.location || '',
        leetCodeUrl: activeDraft.leetCodeUrl || '',
        codeforcesUrl: activeDraft.codeforcesUrl || '',
        hackerRankUrl: activeDraft.hackerRankUrl || '',
        gitLabUrl: activeDraft.gitLabUrl || '',
        educations: activeDraft.educations || [],
        experiences: activeDraft.experiences || [],
        roleAppliedOptionId: activeDraft.roleAppliedOptionId ?? (roles.length > 0 ? roles[0].id : null),
        sourceOptionId: activeDraft.sourceOptionId,
        sourceDetail: activeDraft.sourceDetail || '',
      });
      setFormErrors({});
    }
  }, [activeDraft, roles]);

  useEffect(() => {
    if (roles.length > 0 && !editForm.roleAppliedOptionId) {
      setEditForm((prev) => ({
        ...prev,
        roleAppliedOptionId: prev.roleAppliedOptionId ?? roles[0].id,
      }));
    }
  }, [roles, editForm.roleAppliedOptionId]);

  // Next / Previous navigation in queue
  const currentIndex = drafts.findIndex((d) => d.id === selectedDraftId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < drafts.length - 1;

  const navigateQueue = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && hasPrev) {
        setSelectedDraftId(drafts[currentIndex - 1].id);
      } else if (direction === 'next' && hasNext) {
        setSelectedDraftId(drafts[currentIndex + 1].id);
      }
    },
    [currentIndex, drafts, hasNext, hasPrev]
  );

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateQueue('prev');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateQueue('next');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Quick approve
        e.preventDefault();
        handleApprove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ApproveCandidateDraftRequest }) => {
      return approveCandidateDraft(id, payload);
    },
    onSuccess: (data) => {
      addToast(data.message || 'Candidate approved & created successfully!', 'success');
      void queryClient.invalidateQueries({ queryKey: ['candidate-drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft-batches'] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['recruiting-analytics'] });
      onCandidateCreated?.();

      if (hasNext) {
        setSelectedDraftId(drafts[currentIndex + 1].id);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err.message || 'Failed to approve draft.';
      addToast(msg, 'danger');
    },
  });

  const discardMutation = useMutation({
    mutationFn: async (id: number) => {
      return discardCandidateDraft(id);
    },
    onSuccess: () => {
      addToast('Draft marked as discarded.', 'info');
      void queryClient.invalidateQueries({ queryKey: ['candidate-drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft-batches'] });

      if (hasNext) {
        setSelectedDraftId(drafts[currentIndex + 1].id);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err.message || 'Failed to discard draft.';
      addToast(msg, 'danger');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateCandidateDraftRequest }) => {
      return updateCandidateDraft(id, payload);
    },
    onSuccess: () => {
      addToast('Draft changes saved.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['candidate-drafts'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data || 'Failed to update draft.', 'danger');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      return bulkApproveCandidateDrafts({
        draftIds: Array.from(selectedIds),
        defaultRoleAppliedOptionId: bulkRoleId || undefined,
      });
    },
    onSuccess: (data) => {
      addToast(`Batch approved ${data.approvedCount} candidate(s)!`, 'success');
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ['candidate-drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft-batches'] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
      onCandidateCreated?.();
    },
    onError: (err: any) => {
      addToast(err?.response?.data || 'Bulk approval failed.', 'danger');
    },
  });

  const bulkDiscardMutation = useMutation({
    mutationFn: async () => {
      return bulkDiscardCandidateDrafts({
        draftIds: Array.from(selectedIds),
      });
    },
    onSuccess: (data) => {
      addToast(`Discarded ${data.discardedCount} draft(s).`, 'info');
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ['candidate-drafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draft-batches'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data || 'Bulk discard failed.', 'danger');
    },
  });

  // Handle Approve Action
  const handleApprove = () => {
    if (!activeDraft) return;

    const errors: Record<string, string> = {};
    if (!editForm.fullName?.trim()) errors.fullName = 'Full name is required.';
    if (!editForm.email?.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(editForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!editForm.roleAppliedOptionId) {
      errors.role = 'Please assign an applied role before approving.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Please complete required fields before approving.', 'warning');
      return;
    }

    approveMutation.mutate({
      id: activeDraft.id,
      payload: {
        fullName: editForm.fullName!.trim(),
        email: editForm.email!.trim(),
        phone: editForm.phone?.trim() || null,
        currentTitle: editForm.currentTitle?.trim() || null,
        relevantExperience: editForm.relevantExperience?.trim() || '0 Years',
        skills: editForm.skills?.trim() || null,
        summary: editForm.summary?.trim() || null,
        linkedInUrl: editForm.linkedInUrl?.trim() || null,
        githubUrl: editForm.githubUrl?.trim() || null,
        portfolioUrl: editForm.portfolioUrl?.trim() || null,
        location: editForm.location?.trim() || null,
        leetCodeUrl: editForm.leetCodeUrl?.trim() || null,
        codeforcesUrl: editForm.codeforcesUrl?.trim() || null,
        hackerRankUrl: editForm.hackerRankUrl?.trim() || null,
        gitLabUrl: editForm.gitLabUrl?.trim() || null,
        educations: editForm.educations || [],
        experiences: editForm.experiences || [],
        roleAppliedOptionId: editForm.roleAppliedOptionId!,
        sourceOptionId: editForm.sourceOptionId || null,
        sourceDetail: editForm.sourceDetail?.trim() || null,
      },
    });
  };

  // Toggle selection for bulk actions
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === drafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(drafts.map((d) => d.id)));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`Copied ${label} to clipboard!`, 'info');
  };

  const selectedDraftsList = useMemo(() => drafts.filter((d) => selectedIds.has(d.id)), [drafts, selectedIds]);
  const showApproveBulk = selectedDraftsList.some((d) => d.status !== 'Approved');
  const showDiscardBulk = selectedDraftsList.some((d) => d.status !== 'Discarded');

  return (
    <div className="draft-workspace">
      {/* 1. Header Toolbar & Command Row */}
      <div className="draft-toolbar">
        <div className="draft-toolbar__left">
          {/* Status Filter Chips */}
          <div className="segmented">
            <button
              type="button"
              className={`segmented__item ${statusFilter === 'Pending' ? 'segmented__item--active active' : ''}`}
              onClick={() => setStatusFilter('Pending')}
            >
              <Clock size={13} className="me-1.5 text-warning-foreground" />
              Pending
              <span className="draft-counter-badge draft-counter-badge--pending">
                {draftsData?.totalPending ?? 0}
              </span>
            </button>
            <button
              type="button"
              className={`segmented__item ${statusFilter === 'Approved' ? 'segmented__item--active active' : ''}`}
              onClick={() => setStatusFilter('Approved')}
            >
              <CheckCircle2 size={13} className="me-1.5 text-success-foreground" />
              Approved
              <span className="draft-counter-badge draft-counter-badge--success">
                {draftsData?.totalApproved ?? 0}
              </span>
            </button>
            <button
              type="button"
              className={`segmented__item ${statusFilter === 'Discarded' ? 'segmented__item--active active' : ''}`}
              onClick={() => setStatusFilter('Discarded')}
            >
              <XCircle size={13} className="me-1.5 text-[var(--danger-text)]" />
              Discarded
              <span className="draft-counter-badge draft-counter-badge--danger">
                {draftsData?.totalDiscarded ?? 0}
              </span>
            </button>
          </div>
        </div>

        <div className="draft-toolbar__right">
          {/* Batch Selector */}
          {batches.length > 0 && (
            <select
              className="form-select form-select-sm draft-batch-select"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              aria-label="Filter by Batch"
            >
              <option value="">All Upload Batches ({batches.reduce((acc, b) => acc + b.totalDrafts, 0)})</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchName || b.batchId} ({b.pendingDrafts} pending / {b.totalDrafts} total)
                </option>
              ))}
            </select>
          )}

          {/* Search Bar */}
          <div className="search-field draft-search-field">
            <Search size={14} className="search-field__icon" aria-hidden="true" />
            <input
              type="search"
              className="form-control form-control-sm search-field__input"
              placeholder="Search candidate, role, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary inline-flex items-center shrink-0"
            onClick={() => {
              void refetchDrafts();
              void refetchBatches();
            }}
            title="Refresh Drafts"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. Workspace Split-Screen: Master Rail + Studio */}
      <div className="draft-split-view">
        {/* LEFT RAIL: Queue Cards List */}
        <div className="draft-list-rail">
          <div className="flex items-stretch justify-between border-b border-border shrink-0 bg-surface">
            <div 
              className="flex items-center justify-center shrink-0"
              style={{ width: '36px', borderRight: '1px solid var(--border)' }}
            >
              <button
                type="button"
                className="btn btn-link p-0 text-muted-foreground inline-flex items-center"
                onClick={toggleSelectAll}
                title={selectedIds.size === drafts.length ? 'Deselect all' : 'Select all'}
              >
                {selectedIds.size > 0 && selectedIds.size === drafts.length ? (
                  <CheckSquare size={16} className="text-brand" />
                ) : (
                  <Square size={16} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between grow pr-4 pl-2 py-2">
              <span className="text-[length:var(--text-sm)] font-semibold text-muted-foreground">
                {drafts.length} {statusFilter === 'all' ? 'total' : statusFilter.toLowerCase()} candidate{drafts.length === 1 ? '' : 's'}
              </span>
              {drafts.length > 0 && (
                <span className="badge-pill badge-neutral text-xs">
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${drafts.length}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="draft-list-rail__body" onScroll={handleScroll}>
            {isLoadingDrafts ? (
              <LoadingPanel />
            ) : drafts.length === 0 ? (
              <EmptyState
                icon={<Layers size={24} />}
                title="No drafts found"
                description={
                  statusFilter === 'Pending'
                    ? 'All uploaded resumes have been reviewed and approved.'
                    : 'No drafts match the selected filters.'
                }
              />
            ) : (
              drafts.map((d) => {
                const isSelected = d.id === selectedDraftId;
                const isChecked = selectedIds.has(d.id);
                const displayTitle =
                  d.fullName?.trim() ||
                  d.originalFileName
                    .replace(/\.[^/.]+$/, '')
                    .replace(/_/g, ' ')
                    .replace(/-/g, ' ');

                return (
                  <div
                    key={d.id}
                    className={`draft-item-card ${isSelected ? 'draft-item-card--active' : ''} ${isChecked ? 'draft-item-card--checked' : ''} d-flex align-items-stretch border-bottom p-0`}
                    onClick={() => setSelectedDraftId(d.id)}
                  >
                    {/* Dedicated Checkbox Column */}
                    <div 
                      className="draft-item-card__checkbox-col flex items-center justify-center shrink-0"
                      style={{ 
                        width: '36px', 
                        borderRight: '1px solid var(--border)',
                        background: isChecked ? 'var(--primary-tint)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(d.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input m-0"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => {
                          toggleSelect(d.id);
                        }}
                        aria-label={`Select ${displayTitle}`}
                      />
                    </div>

                    {/* Main Card Content */}
                    <div className="py-4 pr-4 pl-2 flex items-start gap-2.5 min-w-0 grow">
                      <div className="avatar shrink-0">
                        {initials(displayTitle)}
                      </div>
                      <div className="draft-item-card__content min-w-0 grow">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="draft-item-card__name truncate grow">
                            {displayTitle}
                          </span>
                          {statusFilter === 'all' && (
                            <span
                              className={`${
                                d.status === 'Approved'
                                  ? 'draft-badge--approved'
                                  : d.status === 'Discarded'
                                  ? 'draft-badge--discarded'
                                  : 'draft-badge--pending'
                              } flex-shrink-0`}
                            >
                              {d.status}
                            </span>
                          )}
                        </div>

                        <div className="draft-item-card__role truncate">
                          {d.currentTitle || d.roleAppliedOptionName || 'Unassigned Role'}
                        </div>

                        <div className="draft-item-card__meta min-w-0">
                          <span className="flex items-center gap-1 min-w-0 grow">
                            <FileText size={11} className="shrink-0" />
                            <span className="truncate inline-block min-w-0">{d.originalFileName}</span>
                          </span>
                          <span className="shrink-0 ml-2">
                            {(d.fileSizeBytes / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isFetchingNextPage && (
              <div className="p-4 text-center">
                <div className="spinner-border spinner-border-sm text-text-soft" role="status">
                  <span className="sr-only">Loading more...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT STUDIO: Candidate Review & Approval Studio */}
        <div className="draft-editor-studio">
          {isLoadingActiveDraft ? (
            <LoadingPanel />
          ) : !activeDraft ? (
            <div className="draft-editor-studio__empty">
              <EmptyState
                icon={<FileText size={24} />}
                title="Select a candidate to review"
                description="Pick a resume from the queue on the left to verify parsed fields, assign a role, and approve."
              />
            </div>
          ) : (
            <div className="draft-editor-studio__container">
              {/* Studio Hero Header */}
              <div className="draft-editor-studio__head">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="avatar avatar--lg shrink-0">
                    {initials(editForm.fullName || activeDraft.originalFileName)}
                  </div>
                  <div className="min-w-0">
                    <h5 className="mb-0 font-bold truncate">
                      {editForm.fullName || activeDraft.originalFileName}
                    </h5>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="badge-pill badge-neutral text-xs inline-flex items-center gap-1">
                        <FileText size={11} />
                        {activeDraft.originalFileName} ({(activeDraft.fileSizeBytes / 1024).toFixed(0)} KB)
                      </span>
                      {activeDraft.batchName && (
                        <span className="badge-pill badge-outline text-xs">
                          {activeDraft.batchName}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        Added {new Date(activeDraft.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Queue Stepper Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary inline-flex items-center gap-1"
                    disabled={!hasPrev}
                    onClick={() => navigateQueue('prev')}
                    title="Previous (Ctrl+Left)"
                  >
                    <ChevronLeft size={15} />
                    <span className="hidden md:inline">Prev</span>
                  </button>
                  <span className="badge-pill badge-neutral text-xs px-2.5">
                    {currentIndex >= 0 ? `${currentIndex + 1} of ${drafts.length}` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary inline-flex items-center gap-1"
                    disabled={!hasNext}
                    onClick={() => navigateQueue('next')}
                    title="Next (Ctrl+Right)"
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Studio Body Form */}
              <div className="draft-editor-studio__body">
                <div className="draft-form-section">
                  <h6 className="draft-form-section__title">
                    <Briefcase size={14} className="text-brand me-1.5" />
                    Candidate Identity &amp; Contact
                  </h6>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Full Name */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">
                        Full Name <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.fullName ? 'is-invalid' : ''}`}
                        placeholder="Candidate full name"
                        value={editForm.fullName || ''}
                        onChange={(e) => {
                          setEditForm((prev) => ({ ...prev, fullName: e.target.value }));
                          if (formErrors.fullName) setFormErrors((fe) => ({ ...fe, fullName: '' }));
                        }}
                      />
                      {formErrors.fullName && (
                        <div className="invalid-feedback">{formErrors.fullName}</div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold flex justify-between items-center">
                        <span>Email Address <span className="required-star">*</span></span>
                        {editForm.email && (
                          <button
                            type="button"
                            className="btn btn-link p-0 text-muted-foreground text-xs inline-flex items-center gap-1"
                            onClick={() => copyToClipboard(editForm.email!, 'Email')}
                          >
                            <Copy size={11} /> Copy
                          </button>
                        )}
                      </label>
                      <div className="input-group">
                        <span className="input-group-text"><Mail size={14} /></span>
                        <input
                          type="email"
                          className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                          placeholder="candidate@example.com"
                          value={editForm.email || ''}
                          onChange={(e) => {
                            setEditForm((prev) => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors((fe) => ({ ...fe, email: '' }));
                          }}
                        />
                      </div>
                      {formErrors.email && (
                        <div className="text-[var(--danger-text)] text-[length:var(--text-sm)] mt-1">{formErrors.email}</div>
                      )}
                    </div>

                    {/* Current Job Title */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Current / Extracted Job Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Senior Backend Engineer"
                        value={editForm.currentTitle || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, currentTitle: e.target.value }))
                        }
                      />
                    </div>

                    {/* Phone */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Phone Number</label>
                      <div className="input-group">
                        <span className="input-group-text"><Phone size={14} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="+880 1700-000000"
                          value={editForm.phone || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Location (City/Area)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Dhaka, Bangladesh"
                        value={editForm.location || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, location: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="draft-form-section mt-6">
                  <h6 className="draft-form-section__title">
                    <Sparkles size={14} className="text-brand me-1.5" />
                    Application &amp; Job Role Assignment
                  </h6>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Role Applied For */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">
                        Role Applied For <span className="required-star">*</span>
                      </label>
                      <SearchableSelect
                        options={roles.map((r) => ({ id: r.id, name: r.name }))}
                        value={editForm.roleAppliedOptionId || null}
                        onChange={(val) => {
                          setEditForm((prev) => ({ ...prev, roleAppliedOptionId: val as number | null }));
                          if (formErrors.role) setFormErrors((fe) => ({ ...fe, role: '' }));
                        }}
                        placeholder="Select position / job opening..."
                      />
                      {formErrors.role && (
                        <div className="text-[var(--danger-text)] text-[length:var(--text-sm)] mt-1">{formErrors.role}</div>
                      )}
                    </div>

                    {/* Relevant Experience */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">
                        Relevant Experience <span className="required-star">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {EXPERIENCE_PRESETS.map((preset) => {
                          const isActive = editForm.relevantExperience === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              className={`btn btn-xs ${
                                isActive ? 'btn-primary' : 'btn-outline-secondary'
                              }`}
                              onClick={() =>
                                setEditForm((prev) => ({ ...prev, relevantExperience: preset }))
                              }
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                      {(!editForm.relevantExperience ||
                        !EXPERIENCE_PRESETS.includes(editForm.relevantExperience)) && (
                        <input
                          type="text"
                          className="form-control form-control-sm mt-2"
                          placeholder="e.g. 4 Years"
                          value={editForm.relevantExperience || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, relevantExperience: e.target.value }))
                          }
                        />
                      )}
                    </div>

                    {/* Source Option */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Sourcing Channel</label>
                      <SearchableSelect
                        options={sources.map((s) => ({ id: s.id, name: s.name }))}
                        value={editForm.sourceOptionId || null}
                        onChange={(val) =>
                          setEditForm((prev) => ({ ...prev, sourceOptionId: val as number | null }))
                        }
                        placeholder="Select source..."
                      />
                    </div>

                    {/* Source Detail */}
                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Source Detail / Campaign</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. LinkedIn Inbound, Campus 2026"
                        value={editForm.sourceDetail || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, sourceDetail: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="draft-form-section mt-6">
                  <h6 className="draft-form-section__title">
                    <Globe size={14} className="text-brand me-1.5" />
                    Skills, Profile &amp; Bio
                  </h6>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Skills */}
                    <div className="col-span-12">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Extracted Skills (Summary)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. C#, .NET Core, TypeScript, React, Docker, Kubernetes"
                        value={editForm.skills || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, skills: e.target.value }))
                        }
                      />
                      {editForm.skills && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {editForm.skills
                            .split(/[,•|;\n]/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((skill, idx) => (
                              <span key={idx} className="badge-pill badge-neutral text-xs">
                                {skill}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Social & Dev Profiles */}
                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">LinkedIn Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="linkedin.com/in/..."
                        value={editForm.linkedInUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, linkedInUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">GitHub Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="github.com/..."
                        value={editForm.githubUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, githubUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">GitLab Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="gitlab.com/..."
                        value={editForm.gitLabUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, gitLabUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">LeetCode Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="leetcode.com/u/..."
                        value={editForm.leetCodeUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, leetCodeUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Codeforces Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="codeforces.com/profile/..."
                        value={editForm.codeforcesUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, codeforcesUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">HackerRank Profile</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="hackerrank.com/profile/..."
                        value={editForm.hackerRankUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, hackerRankUrl: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Portfolio / Personal Website</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="https://..."
                        value={editForm.portfolioUrl || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))
                        }
                      />
                    </div>

                    {/* Bio / Summary */}
                    <div className="col-span-12">
                      <label className="form-label text-[length:var(--text-sm)] font-semibold">Professional Summary &amp; Bio</label>
                      <textarea
                        rows={3}
                        className="form-control"
                        placeholder="Candidate overview, background summary..."
                        value={editForm.summary || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, summary: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Education Section */}
                <div className="draft-form-section mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="draft-form-section__title mb-0 border-0 pb-0">
                      <FileText size={14} className="text-brand me-1.5" />
                      Education &amp; Academic Qualifications
                    </h6>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-primary"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          educations: [
                            ...(prev.educations || []),
                            { degree: 'BSc in CSE', institution: 'University', graduationYear: '2024', cgpa: '' },
                          ],
                        }))
                      }
                    >
                      + Add Education
                    </button>
                  </div>

                  {(editForm.educations || []).length === 0 ? (
                    <div className="text-muted-foreground text-[length:var(--text-sm)] py-2">No education records extracted. Click &quot;+ Add Education&quot; to add one.</div>
                  ) : (
                    <div className="flex flex-col gap-4 mt-2">
                      {(editForm.educations || []).map((edu, idx) => (
                        <div key={idx} className="p-4 rounded-[var(--radius-md)] border border-border border-subtle bg-surface-muted relative">
                          <button
                            type="button"
                            className="btn btn-link text-[var(--danger-text)] p-0 absolute"
                            style={{ top: '8px', right: '10px' }}
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                educations: prev.educations?.filter((_, i) => i !== idx),
                              }))
                            }
                            title="Remove Education"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="grid grid-cols-12 gap-4 gap-2">
                            <div className="col-span-12 md:col-span-6">
                              <label className="form-label text-xs font-semibold mb-1">Degree / Major</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. BSc in Computer Science & Engineering"
                                value={edu.degree}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    educations: prev.educations?.map((item, i) =>
                                      i === idx ? { ...item, degree: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-12 md:col-span-6 pr-6">
                              <label className="form-label text-xs font-semibold mb-1">Institution / University</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. BUET, DU, NSU, BRAC University"
                                value={edu.institution}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    educations: prev.educations?.map((item, i) =>
                                      i === idx ? { ...item, institution: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-6 md:col-span-4">
                              <label className="form-label text-xs font-semibold mb-1">Graduation Year</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. 2024"
                                value={edu.graduationYear || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    educations: prev.educations?.map((item, i) =>
                                      i === idx ? { ...item, graduationYear: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-6 md:col-span-4">
                              <label className="form-label text-xs font-semibold mb-1">CGPA / GPA</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. 3.85 / 4.00"
                                value={edu.cgpa || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    educations: prev.educations?.map((item, i) =>
                                      i === idx ? { ...item, cgpa: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Experience Section */}
                <div className="draft-form-section mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="draft-form-section__title mb-0 border-0 pb-0">
                      <Briefcase size={14} className="text-brand me-1.5" />
                      Work &amp; Employment History
                    </h6>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-primary"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          experiences: [
                            ...(prev.experiences || []),
                            { jobTitle: 'Software Engineer', company: 'Company Name', duration: '2022 - Present', description: '' },
                          ],
                        }))
                      }
                    >
                      + Add Experience
                    </button>
                  </div>

                  {(editForm.experiences || []).length === 0 ? (
                    <div className="text-muted-foreground text-[length:var(--text-sm)] py-2">No work history extracted. Click &quot;+ Add Experience&quot; to add one.</div>
                  ) : (
                    <div className="flex flex-col gap-4 mt-2">
                      {(editForm.experiences || []).map((exp, idx) => (
                        <div key={idx} className="p-4 rounded-[var(--radius-md)] border border-border border-subtle bg-surface-muted relative">
                          <button
                            type="button"
                            className="btn btn-link text-[var(--danger-text)] p-0 absolute"
                            style={{ top: '8px', right: '10px' }}
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                experiences: prev.experiences?.filter((_, i) => i !== idx),
                              }))
                            }
                            title="Remove Experience"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="grid grid-cols-12 gap-4 gap-2">
                            <div className="col-span-12 md:col-span-5">
                              <label className="form-label text-xs font-semibold mb-1">Job Title</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. Senior Backend Engineer"
                                value={exp.jobTitle}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    experiences: prev.experiences?.map((item, i) =>
                                      i === idx ? { ...item, jobTitle: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                              <label className="form-label text-xs font-semibold mb-1">Company</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. Tech Innovations Ltd"
                                value={exp.company}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    experiences: prev.experiences?.map((item, i) =>
                                      i === idx ? { ...item, company: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-12 md:col-span-3 pr-6">
                              <label className="form-label text-xs font-semibold mb-1">Duration / Dates</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. Jan 2022 - Present"
                                value={exp.duration || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    experiences: prev.experiences?.map((item, i) =>
                                      i === idx ? { ...item, duration: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-span-12">
                              <label className="form-label text-xs font-semibold mb-1">Responsibilities / Highlights</label>
                              <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                placeholder="Key achievements, stack used, responsibilities..."
                                value={exp.description || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    experiences: prev.experiences?.map((item, i) =>
                                      i === idx ? { ...item, description: val } : item
                                    ),
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Studio Sticky Footer Actions */}
              <div className="draft-editor-studio__foot">
                <button
                  type="button"
                  className="btn btn-ghost-danger btn-sm inline-flex items-center gap-1.5"
                  disabled={discardMutation.isPending || activeDraft.status === 'Discarded'}
                  onClick={() => discardMutation.mutate(activeDraft.id)}
                >
                  <Trash2 size={14} />
                  Discard Draft
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: activeDraft.id,
                        payload: editForm,
                      })
                    }
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
                    disabled={approveMutation.isPending || activeDraft.status === 'Approved'}
                    onClick={handleApprove}
                    title="Approve and create candidate (Ctrl+Enter)"
                  >
                    <UserCheck size={14} />
                    {approveMutation.isPending ? 'Approving...' : 'Approve & Create Candidate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Bulk Action Bar (when multiple items selected) */}
      {selectedIds.size > 0 && (
        <div className="draft-bulk-bar">
          <div className="draft-bulk-bar__content">
            <span className="font-semibold text-[length:var(--text-sm)] whitespace-nowrap">
              {selectedIds.size} candidate{selectedIds.size === 1 ? '' : 's'} selected
            </span>

            <div style={{ minWidth: 200 }}>
              <select
                className="form-select form-select-sm"
                value={bulkRoleId ?? ''}
                onChange={(e) => setBulkRoleId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Assign Role (Optional)...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {showApproveBulk && (
              <button
                type="button"
                className="btn btn-success btn-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                disabled={bulkApproveMutation.isPending}
                onClick={() => bulkApproveMutation.mutate()}
              >
                <CheckCircle2 size={14} />
                {bulkApproveMutation.isPending
                  ? 'Approving...'
                  : `Approve Selected (${selectedIds.size})`}
              </button>
            )}

            {showDiscardBulk && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                disabled={bulkDiscardMutation.isPending}
                onClick={() => bulkDiscardMutation.mutate()}
              >
                <XCircle size={14} />
                Discard Selected
              </button>
            )}

            <button
              type="button"
              className="btn btn-link btn-sm text-muted-foreground ml-auto no-underline"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
