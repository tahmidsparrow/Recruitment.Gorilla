// Dashboard KPI icons. Thin wrappers over lucide-react so call sites keep the
// names they always used and the size/stroke stay consistent with the rest of
// the shell (16px nav icons, 20px inside the KPI chip, strokeWidth 1.75).
//
// These used to be hand-drawn SVGs; lucide draws the same six glyphs and keeps
// the whole product on one icon family.

import {
  CalendarPlus,
  Hourglass,
  IdCard,
  Share2,
  UserCheck,
  UserX,
  type LucideProps,
} from 'lucide-react';

const base: LucideProps = {
  size: 20,
  strokeWidth: 1.75,
  'aria-hidden': true,
};

/** Total — id card. */
export const IdCardIcon = () => <IdCard {...base} />;

/** In process — hourglass. */
export const HourglassIcon = () => <Hourglass {...base} />;

/** Recommended — person with check. */
export const PersonCheckIcon = () => <UserCheck {...base} />;

/** Rejected — person with x. */
export const PersonXIcon = () => <UserX {...base} />;

/** New this week — calendar with plus. */
export const CalendarPlusIcon = () => <CalendarPlus {...base} />;

/** Referred — share arrows. */
export const ShareIcon = () => <Share2 {...base} />;
