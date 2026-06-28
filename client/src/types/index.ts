export interface CVDraft {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
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
  storedFileName: string;
  originalFileName: string;
  fileType: string;
  fileSizeBytes: number;
  initialStatus: string;
  changedBy: string;
}

export interface UpdateCandidatePayload {
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  skills: string | null;
  summary: string | null;
  linkedInUrl: string | null;
}

export interface StatusChangePayload {
  status: string;
  comment: string | null;
  changedBy: string;
}

export interface CandidateListItem {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
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
  changedAt: string;
  changedBy: string;
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
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  cVFiles: CVFileInfo[];
  statusHistory: StatusHistoryEntry[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
