import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ChevronRight, User } from 'lucide-react';
import { initials } from '../../utils/initials';
import { calculateDaysInStage, formatStageAge, isStageStagnant } from '../../utils/stagnantStage';
import type { CandidateListItem } from '../../types';

export interface KanbanCardProps {
  candidate: CandidateListItem;
  onAdvanceClick: (candidate: CandidateListItem) => void;
  canWrite: boolean;
}

export default function KanbanCard({ candidate, onAdvanceClick, canWrite }: KanbanCardProps) {
  const stageDate = candidate.updatedAt || candidate.createdAt;
  const daysInStage = calculateDaysInStage(stageDate);
  const isStagnant = isStageStagnant(stageDate, candidate.currentStatus);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ candidateId: candidate.id, currentStatus: candidate.currentStatus }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('kanban-card--dragging');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('kanban-card--dragging');
  };

  return (
    <div
      className={`kanban-card ${isStagnant ? 'kanban-card--stagnant' : ''}`}
      draggable={canWrite}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-candidate-id={candidate.id}
    >
      <div className="kanban-card__header">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <span className="avatar avatar--sm flex-shrink-0" aria-hidden="true">
            {initials(candidate.fullName) || <User size={12} />}
          </span>
          <Link
            to={`/candidates/${candidate.id}`}
            className="kanban-card__name text-truncate"
            title={candidate.fullName}
          >
            {candidate.fullName}
          </Link>
        </div>
      </div>

      <div className="kanban-card__meta">
        {candidate.appliedRole && (
          <span className="kanban-card__role text-truncate" title={candidate.appliedRole}>
            {candidate.appliedRole}
          </span>
        )}
        {candidate.source && (
          <span className="kanban-card__source text-truncate" title={`Source: ${candidate.source}`}>
            {candidate.source}
          </span>
        )}
      </div>

      <div className="kanban-card__footer">
        <div className="kanban-card__age">
          {isStagnant ? (
            <span
              className="kanban-badge kanban-badge--stagnant"
              title={`Bottleneck Warning: Candidate has been in ${candidate.currentStatus} for ${daysInStage} days (> 5 business days)`}
            >
              <AlertTriangle size={12} className="me-1 flex-shrink-0" />
              {formatStageAge(daysInStage)} Stagnant
            </span>
          ) : (
            <span className="kanban-badge kanban-badge--neutral" title={`Time in stage: ${formatStageAge(daysInStage)}`}>
              <Clock size={11} className="me-1 flex-shrink-0" />
              {formatStageAge(daysInStage)}
            </span>
          )}
        </div>

        {canWrite && (
          <button
            type="button"
            className="btn btn-sm kanban-card__advance-btn"
            title="Advance candidate to next stage"
            onClick={() => onAdvanceClick(candidate)}
          >
            Advance <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
