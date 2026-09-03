import React, { useEffect, useRef, useState } from 'react';
import type { StatusOption } from '../../types';

export interface KanbanMinimapProps {
  statusOptions: StatusOption[];
  boardRef: React.RefObject<HTMLDivElement | null>;
}

export default function KanbanMinimap({ statusOptions, boardRef }: KanbanMinimapProps) {
  const [scrollRatio, setScrollRatio] = useState({ left: 0, width: 1 });
  const [isScrollable, setIsScrollable] = useState(false);
  const isDraggingRef = useRef(false);
  const minimapRef = useRef<HTMLDivElement | null>(null);

  const updateScrollState = () => {
    const el = boardRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const canScroll = scrollWidth > clientWidth + 10;
    setIsScrollable(canScroll);

    if (scrollWidth > 0) {
      const left = scrollLeft / scrollWidth;
      const width = Math.min(1, clientWidth / scrollWidth);
      setScrollRatio({ left, width });
    }
  };

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    // Initial check after layout render
    const timer = setTimeout(updateScrollState, 100);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      clearTimeout(timer);
    };
  }, [boardRef, statusOptions]);

  // Click or drag on minimap to scroll the board
  const scrollToMinimapPosition = (clientX: number) => {
    const minimapEl = minimapRef.current;
    const boardEl = boardRef.current;
    if (!minimapEl || !boardEl) return;

    const rect = minimapEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const targetRatio = clickX / rect.width;

    const targetScrollLeft = targetRatio * boardEl.scrollWidth - boardEl.clientWidth / 2;
    boardEl.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: isDraggingRef.current ? 'auto' : 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    scrollToMinimapPosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        scrollToMinimapPosition(moveEvent.clientX);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isScrollable || statusOptions.length <= 1) {
    return null;
  }

  return (
    <div
      className="kanban-minimap"
      ref={minimapRef}
      onMouseDown={handleMouseDown}
      title="Click or drag to navigate pipeline stages"
      aria-label="Pipeline navigation minimap"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(scrollRatio.left * 100)}
    >
      {/*
        A continuous track with a lens, not one bar per stage.

        The per-stage bars were all the same width whatever the column
        underneath measured, so the picture they drew was not the board — with
        nineteen stages it read as a barcode and told you nothing about where
        you were. The lens over a plain track is what a scroll indicator
        actually is, and the tick marks keep the "how many stages" cue without
        implying each one is the same size.
      */}
      <div className="kanban-minimap__track">
        <div className="kanban-minimap__ticks" aria-hidden="true">
          {statusOptions.map((opt) => (
            <span key={opt.id} className="kanban-minimap__tick" title={opt.name} />
          ))}
        </div>
        <div
          className="kanban-minimap__lens"
          style={{
            left: `${scrollRatio.left * 100}%`,
            width: `${Math.max(8, scrollRatio.width * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
