import { initialsOf } from '../../utils/initials';
import { avatarTone } from '../../utils/avatarTone';
import { useTheme } from '../../theme/ThemeContext';

type AvatarSize = 'sm' | 'md' | 'lg' | 'hero';

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'avatar avatar--sm',
  md: 'avatar',
  lg: 'avatar avatar--lg',
  hero: 'avatar avatar--hero',
};

/**
 * Initials on a tinted disc, tinted deterministically from the name.
 *
 * This replaces the four hand-rolled copies that existed — the status
 * timeline, the interview page, the sidebar user card and the job-opening
 * recruiter stack each built their own `<span className="avatar">` with their
 * own initials call — and, more importantly, it is what puts a face on the
 * candidate list. The old table was six columns of grey text; the identity
 * column now leads with a coloured disc, which is what makes a 56px row worth
 * its height.
 *
 * `name` is both the label and the tone seed, so the same person is the same
 * colour on every screen.
 */
export default function Avatar({
  name,
  email,
  size = 'md',
  className = '',
}: {
  name: string | null | undefined;
  /** Fallback for the initials when there is no display name. */
  email?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const { theme } = useTheme();
  const label = name || email || '';

  return (
    <span
      className={`${SIZE_CLASS[size]} ${className}`.trim()}
      style={avatarTone(label, theme === 'dark')}
      aria-hidden="true"
    >
      {initialsOf(name, email)}
    </span>
  );
}
