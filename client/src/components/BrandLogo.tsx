/**
 * The Recruitment Gorilla logo: a striding figure mark over a two-weight,
 * letterspaced wordmark.
 *
 * Structure notes:
 *
 * 1. **The mark is inline SVG, the wordmark is HTML text.** Putting the
 *    wordmark in `<text>` means guessing a viewBox width for a string whose
 *    rendered width depends on the font, so it never quite fits and tracking
 *    has to be hand-tuned in user units. As HTML it is typeset by the same
 *    Figtree stack and tokens as the rest of the app.
 *
 * 2. **Three layouts, one source.** `stacked` (mark over wordmark) is the
 *    presentation lockup for the sign-in card; `horizontal` fits the sidebar's
 *    30px row; `mark` is the badge alone for the collapsed rail and favicon.
 *
 * The figure is built from stroked paths rather than filled outlines: strokes
 * keep an even weight at any size, so the mark stays legible at 22px where a
 * tapered silhouette would fill in.
 */

type Layout = 'stacked' | 'horizontal' | 'mark';

type Props = {
  layout?: Layout;
  /** Mark size in px. The wordmark scales from it. */
  size?: number;
  className?: string;
  /** Set when the logo is the accessible name; omit when a label sits beside it. */
  title?: string;
};

/**
 * A gorilla in spectacles, drawn in a 64×64 box.
 *
 * Three flat tones and no gradients, so it holds on either theme ground:
 * `accent` is the fur, `soft` the hairless face, `deep` the brow, the frames
 * and the features. The heavy brow is what makes it a gorilla rather than a
 * generic ape; the round frames are what make it a studious one.
 *
 * Frames are stroked at 2.8 rather than a hairline: at the 30px sidebar size a
 * 1px frame disappears and the face reads as a smudge.
 */
function Mark() {
  const accent = 'var(--brand-mark-accent, #468189)';
  const deep = 'var(--brand-mark-deep, #2f5f66)';
  const soft = 'var(--brand-mark-soft, #a8d0d3)';

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      {/* Ears: small and tucked against the skull. Big ears set high are what
          made the first pass read as a monkey — a gorilla's barely clear the
          head. */}
      <circle cx="13.2" cy="31" r="4.3" fill={accent} />
      <circle cx="50.8" cy="31" r="4.3" fill={accent} />

      {/* Head. Narrow at the crest, widest through the cheeks at y≈35: the
          heavy lower face is the gorilla's defining proportion. The small peak
          on top is the sagittal crest. */}
      <path
        d="M32 5c6.2 0 10.6 2.3 13.4 6.4 2.4 3.5 3.4 7.9 3.6 12.6.2 5.3-.5 10.4-2.6 14.6C43.6 45.6 38.5 49 32 49s-11.6-3.4-14.4-10.4c-2.1-4.2-2.8-9.3-2.6-14.6.2-4.7 1.2-9.1 3.6-12.6C21.4 7.3 25.8 5 32 5Z"
        fill={accent}
      />

      {/* Hairless face. Its top edge rises to a peak over each eye and dips in
          the middle, so the fur above reads as a heavy brow ridge overhanging
          the eyes. An earlier version drew the brow as a separate deep band
          across the whole head, which read as a swimming cap — the ridge has
          to come from this silhouette, not from a stripe laid over it. */}
      <path
        d="M20.2 28c.5-5.2 3.7-8.1 7.2-7.5 2.5.4 3.4 2.8 4.6 2.8s2.1-2.4 4.6-2.8c3.5-.6 6.7 2.3 7.2 7.5 1.6 6.6-.4 13.6-4.8 17-2.4 1.9-4.7 2.6-7 2.6s-4.6-.7-7-2.6c-4.4-3.4-6.4-10.4-4.8-17Z"
        fill={soft}
      />

      {/* A soft shadow immediately under the ridge, which is what gives the
          brow depth without a hard band. */}
      <path
        d="M21.6 26.4c1.2-3.2 3.6-4.6 6-4.1 1.9.4 3.2 2.3 4.4 2.3s2.5-1.9 4.4-2.3c2.4-.5 4.8.9 6 4.1"
        stroke={deep}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* Spectacles. Lenses tuck under the brow, which is what makes the
          gorilla look studious rather than surprised. */}
      <circle cx="25.6" cy="29.6" r="1.9" fill={deep} />
      <circle cx="38.4" cy="29.6" r="1.9" fill={deep} />
      <circle cx="25.6" cy="29.6" r="5.1" stroke={deep} strokeWidth="2.7" />
      <circle cx="38.4" cy="29.6" r="5.1" stroke={deep} strokeWidth="2.7" />
      <path d="M31.2 29c.5-.9 1.1-.9 1.6 0" stroke={deep} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M20.4 27.6 16.6 26.4" stroke={deep} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M43.6 27.6 47.4 26.4" stroke={deep} strokeWidth="2.3" strokeLinecap="round" />

      {/* Broad low muzzle, with the nostrils set wide — the other half of the
          gorilla read. */}
      <path
        d="M32 35.4c3.9 0 6.6 1.6 6.6 4.1 0 3.1-2.9 5.3-6.6 5.3s-6.6-2.2-6.6-5.3c0-2.5 2.7-4.1 6.6-4.1Z"
        fill={deep}
        opacity="0.16"
      />
      <ellipse cx="29.2" cy="38.3" rx="1.55" ry="1.9" fill={deep} />
      <ellipse cx="34.8" cy="38.3" rx="1.55" ry="1.9" fill={deep} />
      <path
        d="M28.9 42.2c1.9 1.3 4.3 1.3 6.2 0"
        stroke={deep}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BrandLogo({
  layout = 'horizontal',
  size = 30,
  className = '',
  title,
}: Props) {
  return (
    <span
      className={`brand brand--${layout} ${className}`.trim()}
      style={{ ['--brand-size' as string]: `${size}px` }}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <span className="brand__mark" aria-hidden="true">
        <Mark />
      </span>
      {layout !== 'mark' && (
        <span className="brand__word" aria-hidden={title ? true : undefined}>
          <span className="brand__word-a">Recruitment</span>
          <span className="brand__word-b">Gorilla</span>
        </span>
      )}
    </span>
  );
}
