import axios from 'axios';
import type {
  CVDraft,
  CandidateDetail,
  CandidateListItem,
  CreateCandidatePayload,
  PagedResult,
  StatusChangePayload,
  StatusHistoryEntry,
  UpdateCandidatePayload,
} from '../types';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

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

export const createCandidate = async (payload: CreateCandidatePayload): Promise<CandidateDetail> => {
  const { data } = await api.post<CandidateDetail>('/candidates', payload);
  return data;
};

export const updateCandidate = async (id: number, payload: UpdateCandidatePayload): Promise<CandidateDetail> => {
  const { data } = await api.put<CandidateDetail>(`/candidates/${id}`, payload);
  return data;
};

export const addStatus = async (id: number, payload: StatusChangePayload): Promise<StatusHistoryEntry> => {
  const { data } = await api.post<StatusHistoryEntry>(`/candidates/${id}/status`, payload);
  return data;
};
