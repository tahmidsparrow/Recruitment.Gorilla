import axios, { isAxiosError } from 'axios';
import type {
  CVDraft,
  CandidateDetail,
  CreateCandidatePayload,
  DuplicateCandidate,
  PagedResult,
  CandidateListItem,
  StatusChangePayload,
  StatusHistoryEntry,
  UpdateCandidatePayload,
} from '../types';

// Same-origin path. In dev the Vite server proxies /api to the backend on the
// host machine, so the backend itself is never exposed to the network.
const baseURL = '/api';
const api = axios.create({ baseURL });

/** Same-origin URL to stream/download a candidate's stored CV file. */
export const cvFileUrl = (candidateId: number, fileId: number): string =>
  `${baseURL}/candidates/${candidateId}/cv/${fileId}`;

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
