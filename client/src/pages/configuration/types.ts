/** A configurable lookup value. Roles carry the job-opening fields; skills and
 *  interview types use only the first four. Mirrors what the option endpoints
 *  return (see services/api.ts). */
export interface Opt {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  location?: string | null;
  department?: string | null;
  priority?: string | null;
  createdAt?: string;
  endDate?: string;
  title?: string;
  recruiters?: { userId: number; name: string }[];
}
