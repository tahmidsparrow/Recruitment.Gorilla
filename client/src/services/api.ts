import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  AssignableUser,
  CVDraft,
  CandidateDetail,
  ChangePasswordPayload,
  CreateCandidatePayload,
  CreateUserPayload,
  DashboardData,
  DashboardKpis,
  StatusCount,
  TrendPoint,
  JobOpening,
  DuplicateCandidate,
  InterviewDetail,
  InterviewEvaluation,
  LoginPayload,
  LoginResult,
  MyInterview,
  NotificationList,
  PagedResult,
  CandidateListItem,
  ResetPasswordPayload,
  RoleAppliedOption,
  DeleteRoleResult,
  SkillOption,
  StatusOption,
  StatusChangePayload,
  StatusHistoryEntry,
  UpdateCandidatePayload,
  UpdateUserPayload,
  UpsertEvaluationPayload,
  UpsertOptionPayload,
  UserListItem,
} from '../types';

// Same-origin path. In dev the Vite server proxies /api to the backend on the
// host machine, so the backend itself is never exposed to the network.
const baseURL = '/api';
// withCredentials so the httpOnly refresh-token cookie rides along on /auth/* calls.
const api = axios.create({ baseURL, withCredentials: true });

// The short-lived access token lives only in memory (not localStorage) to reduce
// XSS exposure. Session persistence across reloads comes from the httpOnly refresh
// cookie via refreshSession().
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Attach the in-memory access token to every request.
api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

const isAuthUrl = (url?: string) =>
  !!url && (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout'));

// Single-flight refresh so concurrent 401s trigger only one /refresh call.
let refreshPromise: Promise<LoginResult | null> | null = null;

export const refreshSession = async (): Promise<LoginResult | null> => {
  try {
    const { data } = await axios.post<LoginResult>(`${baseURL}/auth/refresh`, null, {
      withCredentials: true,
    });
    accessToken = data.token;
    return data;
  } catch {
    accessToken = null;
    return null;
  }
};

// On 401, try a single silent refresh and replay the request; otherwise go to login.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as RetriableConfig | undefined;
    const status = isAxiosError(err) ? err.response?.status : undefined;

    if (status === 401 && original && !original._retry && !isAuthUrl(original.url)) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshSession();
      const result = await refreshPromise;
      refreshPromise = null;

      if (result) {
        original.headers.Authorization = `Bearer ${result.token}`;
        return api(original);
      }
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export const login = async (payload: LoginPayload): Promise<LoginResult> => {
  const { data } = await api.post<LoginResult>('/auth/login', payload);
  accessToken = data.token;
  return data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore network errors on logout
  }
  accessToken = null;
};

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await api.post('/auth/change-password', payload);
};

// ----- User management (SuperAdmin only) -----
export const getUsers = async (): Promise<UserListItem[]> => {
  const { data } = await api.get<UserListItem[]>('/users');
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<UserListItem> => {
  const { data } = await api.post<UserListItem>('/users', payload);
  return data;
};

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<UserListItem> => {
  const { data } = await api.put<UserListItem>(`/users/${id}`, payload);
  return data;
};

export const resetUserPassword = async (id: number, payload: ResetPasswordPayload): Promise<void> => {
  await api.post(`/users/${id}/reset-password`, payload);
};

/**
 * Downloads a candidate's stored CV file with the auth token attached, then
 * triggers a browser save/open. (A plain <a href> can't send the bearer token.)
 */
export const downloadCvFile = async (candidateId: number, fileId: number): Promise<void> => {
  const res = await api.get(`/candidates/${candidateId}/cv/${fileId}`, { responseType: 'blob' });

  let filename = 'cv';
  const cd = res.headers['content-disposition'] as string | undefined;
  if (cd) {
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    if (m) filename = decodeURIComponent(m[1]);
  }

  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export type CreateCandidateResult =
  | { kind: 'created'; candidate: CandidateDetail }
  | { kind: 'duplicate'; duplicate: DuplicateCandidate };

export const uploadCV = async (file: File): Promise<CVDraft> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<CVDraft>('/cvupload', form);
  return data;
};

// Org-wide dashboard figures (all roles, no owner scope).
export const getDashboardKpis = async (): Promise<DashboardKpis> => {
  const { data } = await api.get<DashboardKpis>('/dashboard/kpis');
  return data;
};

export const getStatusBreakdown = async (): Promise<StatusCount[]> => {
  const { data } = await api.get<StatusCount[]>('/dashboard/status-breakdown');
  return data;
};

export const getApplicationsTrend = async (days = 30): Promise<TrendPoint[]> => {
  const { data } = await api.get<TrendPoint[]>('/dashboard/applications-trend', { params: { days } });
  return data;
};

export const getJobOpenings = async (): Promise<JobOpening[]> => {
  const { data } = await api.get<JobOpening[]>('/dashboard/job-openings');
  return data;
};

// Owner-scoped remainder (by-role / top-skills / upcoming / activity).
export const getDashboard = async (): Promise<DashboardData> => {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
};

export const getCandidates = async (
  params: { search?: string; status?: string; page?: number; pageSize?: number }
): Promise<PagedResult<CandidateListItem>> => {
  const { data } = await api.get<PagedResult<CandidateListItem>>('/candidates', { params });
  return data;
};

export const getCandidate = async (id: number): Promise<CandidateDetail> => {
  const { data } = await api.get<CandidateDetail>(`/candidates/${id}`);
  return data;
};

/** Distinct applied-role values already in use, for the role suggestions dropdown. */
export const getCandidateRoles = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/candidates/roles');
  return data;
};

export const getStatusOptions = async (): Promise<StatusOption[]> => {
  const { data } = await api.get<StatusOption[]>('/status-options');
  return data;
};

export const getInitialStatusOptions = async (): Promise<StatusOption[]> => {
  const { data } = await api.get<StatusOption[]>('/status-options/initial');
  return data;
};

export const getNextStatusOptions = async (candidateId: number): Promise<StatusOption[]> => {
  const { data } = await api.get<StatusOption[]>(`/status-options/next/${candidateId}`);
  return data;
};

export const createCandidate = async (
  payload: CreateCandidatePayload
): Promise<CreateCandidateResult> => {
  try {
    const { data } = await api.post<CandidateDetail>('/candidates', payload);
    return { kind: 'created', candidate: data };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      return { kind: 'duplicate', duplicate: err.response.data as DuplicateCandidate };
    }
    throw err;
  }
};

export const updateCandidate = async (id: number, payload: UpdateCandidatePayload): Promise<CandidateDetail> => {
  const { data } = await api.put<CandidateDetail>(`/candidates/${id}`, payload);
  return data;
};

export const addStatus = async (id: number, payload: StatusChangePayload): Promise<StatusHistoryEntry> => {
  const { data } = await api.post<StatusHistoryEntry>(`/candidates/${id}/status`, payload);
  return data;
};

export const deleteCandidate = async (id: number): Promise<void> => {
  await api.delete(`/candidates/${id}`);
};

// ----- Configuration: Role Applied options -----
export const getRoleOptions = async (includeInactive = false): Promise<RoleAppliedOption[]> => {
  const { data } = await api.get<RoleAppliedOption[]>('/config/roles', { params: { includeInactive } });
  return data;
};

export const createRoleOption = async (payload: UpsertOptionPayload): Promise<RoleAppliedOption> => {
  const { data } = await api.post<RoleAppliedOption>('/config/roles', payload);
  return data;
};

export const updateRoleOption = async (id: number, payload: UpsertOptionPayload): Promise<RoleAppliedOption> => {
  const { data } = await api.put<RoleAppliedOption>(`/config/roles/${id}`, payload);
  return data;
};

export const deleteRoleOption = async (id: number): Promise<DeleteRoleResult> => {
  const { data } = await api.delete<DeleteRoleResult>(`/config/roles/${id}`);
  return data;
};

// ----- Configuration: Skill options -----
export const getSkillOptions = async (includeInactive = false): Promise<SkillOption[]> => {
  const { data } = await api.get<SkillOption[]>('/config/skills', { params: { includeInactive } });
  return data;
};

export const createSkillOption = async (payload: UpsertOptionPayload): Promise<SkillOption> => {
  const { data } = await api.post<SkillOption>('/config/skills', payload);
  return data;
};

export const updateSkillOption = async (id: number, payload: UpsertOptionPayload): Promise<SkillOption> => {
  const { data } = await api.put<SkillOption>(`/config/skills/${id}`, payload);
  return data;
};

export const deleteSkillOption = async (id: number): Promise<void> => {
  await api.delete(`/config/skills/${id}`);
};

/**
 * Fetches a CV file (with auth) as a blob and returns an object URL + content type
 * for in-app preview. Caller must URL.revokeObjectURL(url) on cleanup.
 */
export const previewCvFile = async (
  candidateId: number,
  fileId: number
): Promise<{ url: string; contentType: string }> => {
  const res = await api.get(`/candidates/${candidateId}/cv/${fileId}`, { responseType: 'blob' });
  const blob = res.data as Blob;
  const contentType = (res.headers['content-type'] as string | undefined) ?? blob.type ?? '';
  return { url: URL.createObjectURL(blob), contentType };
};

// ----- Interviews & evaluations -----
export const getAssignableUsers = async (): Promise<AssignableUser[]> => {
  const { data } = await api.get<AssignableUser[]>('/interviews/assignable-users');
  return data;
};

export const getMyInterviews = async (): Promise<MyInterview[]> => {
  const { data } = await api.get<MyInterview[]>('/interviews/mine');
  return data;
};

export const getInterview = async (id: number): Promise<InterviewDetail> => {
  const { data } = await api.get<InterviewDetail>(`/interviews/${id}`);
  return data;
};

export const saveEvaluation = async (
  interviewId: number,
  payload: UpsertEvaluationPayload
): Promise<InterviewEvaluation> => {
  const { data } = await api.put<InterviewEvaluation>(`/interviews/${interviewId}/evaluation`, payload);
  return data;
};

// ----- Notifications -----
export const getNotifications = async (): Promise<NotificationList> => {
  const { data } = await api.get<NotificationList>('/notifications');
  return data;
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('/notifications/read-all');
};
