import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  CVDraft,
  CandidateDetail,
  CreateCandidatePayload,
  DuplicateCandidate,
  LoginPayload,
  LoginResult,
  PagedResult,
  CandidateListItem,
  StatusChangePayload,
  StatusHistoryEntry,
  UpdateCandidatePayload,
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
