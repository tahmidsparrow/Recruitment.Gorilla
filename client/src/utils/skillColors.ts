// Maps a skill name to one of a fixed palette of badge color classes. The mapping
// is a stable hash of the skill name (same skill → same color everywhere), never a
// position-based cycle. Colors themselves live in index.css (.skill-badge--N),
// theme-aware. Keep SKILL_COLOR_COUNT in sync with the CSS.

export const SKILL_COLOR_COUNT = 8;

/** Stable palette index (0..SKILL_COLOR_COUNT-1) for a skill name. */
export const skillColorIndex = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % SKILL_COLOR_COUNT;
};

/** CSS class carrying the badge color tokens, e.g. "skill-badge skill-badge--3". */
export const skillColorClass = (name: string): string => `skill-badge skill-badge--${skillColorIndex(name)}`;
