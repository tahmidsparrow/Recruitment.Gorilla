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
  // Job-opening posting metadata (optional)
  location?: string | null;
  department?: string | null;
  priority?: string | null;
  postedDate?: string | null;
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
  // Optional job-opening fields — only sent for role options (skills ignore them).
  location?: string | null;
  department?: string | null;
  priority?: string | null;
  postedDate?: string | null;
}

export interface StatusChangePayload {
  status: string;
  comment: string | null;
  taskDetails: string | null;
  submissionUrl: string | null;
  interviewAt: string | null;
  // Required (non-empty) when status === 'Interview Scheduled'.
  interviewerUserIds?: number[] | null;
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
  interviewId: number | null;
  interviewers: { userId: number; name: string }[];
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

export type Role = 'SuperAdmin' | 'Admin' | 'Recruiter' | 'Viewer';

export const ALL_ROLES: Role[] = ['SuperAdmin', 'Admin', 'Recruiter', 'Viewer'];

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  name: string;
  email: string;
  roles: Role[];
  mustChangePassword: boolean;
  expiresAt: string;
}

export interface AuthUser {
  name: string;
  email: string;
  roles: Role[];
  mustChangePassword: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  roles: Role[];
  temporaryPassword: string;
}

export interface UpdateUserPayload {
  name: string;
  roles: Role[];
  isActive: boolean;
}

export interface ResetPasswordPayload {
  temporaryPassword: string;
}

// ----- Dashboard -----
export interface DashboardKpis {
  totalCandidates: number;
  inProcess: number;
  recommended: number;
  rejected: number;
  newThisWeek: number;
  referredCount: number;
  referredPercent: number;
}

export interface StatusCount {
  status: string;
  count: number;
  sortOrder: number;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface UpcomingInterview {
  candidateId: number;
  fullName: string;
  role: string | null;
  currentStatus: string;
  interviewAt: string;
}

export interface ActivityItem {
  candidateId: number;
  fullName: string;
  status: string;
  changedBy: string;
  changedAt: string;
}

export interface JobOpening {
  id: number;
  title: string;
  location: string | null;
  department: string | null;
  priority: string | null;
  postedDate: string;
  applicants: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  statusBreakdown: StatusCount[];
  byRole: NameCount[];
  topSkills: NameCount[];
  applicationsTrend: TrendPoint[];
  upcomingInterviews: UpcomingInterview[];
  recentActivity: ActivityItem[];
  activeJobOpenings: JobOpening[];
}

// ----- Interviews & evaluations -----
export interface AssignableUser {
  id: number;
  name: string;
  email: string;
}

export type EvaluationState = 'None' | 'Draft' | 'Submitted';

export interface MyInterview {
  id: number;
  candidateId: number;
  candidateName: string;
  role: string | null;
  scheduledAt: string;
  evaluationState: EvaluationState;
}

export interface EvaluationItem {
  criterionKey: string;
  rating: number | null;
  comment: string | null;
}

export interface InterviewEvaluation {
  id: number;
  interviewerUserId: number;
  interviewerName: string;
  generalAssessment: string | null;
  recommendation: string | null;
  recommendationOther: string | null;
  overallRating: number | null;
  isSubmitted: boolean;
  submittedAt: string | null;
  items: EvaluationItem[];
}

export interface InterviewInterviewerInfo {
  userId: number;
  name: string;
}

export interface InterviewDetail {
  id: number;
  scheduledAt: string;
  candidate: CandidateDetail;
  interviewers: InterviewInterviewerInfo[];
  canEvaluate: boolean;
  myEvaluation: InterviewEvaluation | null;
  allEvaluations: InterviewEvaluation[] | null;
}

export interface UpsertEvaluationPayload {
  generalAssessment: string | null;
  recommendation: string | null;
  recommendationOther: string | null;
  overallRating: number | null;
  items: EvaluationItem[];
  submit: boolean;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
