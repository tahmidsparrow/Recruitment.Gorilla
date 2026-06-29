export interface CVDraft {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  originalFileName: string;
  storedFileName: string;
  fileType: string;
  fileSizeBytes: number;
}

export interface CreateCandidatePayload {
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  appliedRole: string | null;
  isReferred: boolean;
  referenceName: string | null;
  referenceEmail: string | null;
  referenceEmployeeId: string | null;
  roleAppliedOptionId: number | null;
  skillOptionIds: number[];
  storedFileName: string;
  originalFileName: string;
  fileType: string;
  fileSizeBytes: number;
  initialStatus: string;
  initialStatusComment: string | null;
  changedBy: string;
  allowDuplicate?: boolean;
}

export interface DuplicateCandidate {
  message: string;
  existing: CandidateListItem;
}

export interface UpdateCandidatePayload {
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  appliedRole: string | null;
  isReferred: boolean;
  referenceName: string | null;
  referenceEmail: string | null;
  referenceEmployeeId: string | null;
  roleAppliedOptionId: number | null;
  skillOptionIds: number[];
}

export interface RoleAppliedOption {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SkillOption {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface UpsertOptionPayload {
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface StatusChangePayload {
  status: string;
  comment: string | null;
  taskDetails: string | null;
  submissionUrl: string | null;
  interviewAt: string | null;
  changedBy: string;
}

export interface CandidateListItem {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  appliedRole: string | null;
  currentStatus: string;
  createdAt: string;
}

export interface CVFileInfo {
  id: number;
  originalFileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface StatusHistoryEntry {
  id: number;
  status: string;
  comment: string | null;
  taskDetails: string | null;
  submissionUrl: string | null;
  interviewAt: string | null;
  changedAt: string;
  changedBy: string;
}

export interface StatusOption {
  id: number;
  name: string;
  sortOrder: number;
  isInitial: boolean;
}

export interface CandidateDetail {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  appliedRole: string | null;
  isReferred: boolean;
  referenceName: string | null;
  referenceEmail: string | null;
  referenceEmployeeId: string | null;
  roleAppliedOptionId: number | null;
  roleApplied: string | null;
  skillOptions: SkillOption[];
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  cvFiles: CVFileInfo[];
  statusHistory: StatusHistoryEntry[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  username: string;
  expiresAt: string;
}
