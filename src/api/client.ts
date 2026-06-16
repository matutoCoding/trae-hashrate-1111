import type {
  SealApplication,
  Seal,
  SealRegistration,
  DashboardStats,
  ApplicationStatus,
  ApprovalNode,
  SealStatus,
} from '@/shared/types';

const baseURL = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const fullUrl = `${baseURL}${url}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const config: RequestInit = {
    ...options,
    body,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(fullUrl, config);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const result = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (isJson && (result as ApiResponse<never>).error) ||
        (typeof result === 'string' ? result : `HTTP ${response.status}`);
      throw new ApiError(errorMessage, response.status);
    }

    if (isJson) {
      const apiResponse = result as ApiResponse<T>;
      if (!apiResponse.success) {
        throw new ApiError(apiResponse.error || '请求失败');
      }
      return apiResponse.data;
    }

    return result as unknown as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ApiError(error.message);
    }
    throw new ApiError('网络请求失败');
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

interface FetchApplicationsParams {
  status?: ApplicationStatus;
  applicantId?: string;
  department?: string;
}

export function fetchApplications(
  params?: FetchApplicationsParams
): Promise<SealApplication[]> {
  const query = params ? buildQueryString(params as Record<string, unknown>) : '';
  return request<SealApplication[]>(`/applications${query}`);
}

export function fetchApplicationById(id: string): Promise<SealApplication> {
  return request<SealApplication>(`/applications/${id}`);
}

interface CreateApplicationData {
  applicantId: string;
  applicantName: string;
  department?: string;
  sealType: string;
  sealId?: string;
  reason: string;
  documentName: string;
  quantity?: number;
  urgency?: 'normal' | 'urgent' | 'emergency';
  submit?: boolean;
}

export function createApplication(
  data: CreateApplicationData
): Promise<SealApplication> {
  return request<SealApplication>('/applications', {
    method: 'POST',
    body: data,
  });
}

export function updateApplication(
  id: string,
  data: Partial<SealApplication> & { submit?: boolean }
): Promise<SealApplication> {
  return request<SealApplication>(`/applications/${id}`, {
    method: 'PUT',
    body: data,
  });
}

interface FetchPendingApprovalsParams {
  approverId?: string;
  node?: ApprovalNode;
}

export function fetchPendingApprovals(
  params?: FetchPendingApprovalsParams
): Promise<SealApplication[]> {
  const query = params ? buildQueryString(params as Record<string, unknown>) : '';
  return request<SealApplication[]>(`/approvals/pending${query}`);
}

interface ApproveRejectPayload {
  approverId: string;
  approverName: string;
  opinion?: string;
  node: ApprovalNode;
}

export function approveApplication(
  id: string,
  payload: ApproveRejectPayload
): Promise<SealApplication> {
  return request<SealApplication>(`/approvals/${id}/approve`, {
    method: 'POST',
    body: payload,
  });
}

export function rejectApplication(
  id: string,
  payload: ApproveRejectPayload
): Promise<SealApplication> {
  return request<SealApplication>(`/approvals/${id}/reject`, {
    method: 'POST',
    body: payload,
  });
}

interface FetchSealsParams {
  status?: SealStatus;
  sealType?: string;
}

export function fetchSeals(params?: FetchSealsParams): Promise<Seal[]> {
  const query = params ? buildQueryString(params as Record<string, unknown>) : '';
  return request<Seal[]>(`/seals${query}`);
}

export function fetchAvailableSeals(sealType: string): Promise<Seal[]> {
  return request<Seal[]>(`/seals/available/${encodeURIComponent(sealType)}`);
}

export function fetchSealWarnings(): Promise<Seal[]> {
  return request<Seal[]>('/seals/warnings');
}

interface CreateSealData {
  batchNumber: string;
  sealType: string;
  serialNumber: string;
  receivedDate: string;
  expiryDate: string;
  custodian: string;
  enableDate?: string;
  remark?: string;
}

export function createSeal(data: CreateSealData): Promise<Seal> {
  return request<Seal>('/seals', {
    method: 'POST',
    body: data,
  });
}

export function enableSeal(id: string): Promise<Seal> {
  return request<Seal>(`/seals/${id}/enable`, {
    method: 'PUT',
  });
}

export function updateSeal(
  id: string,
  data: Partial<Seal>
): Promise<Seal> {
  return request<Seal>(`/seals/${id}`, {
    method: 'PUT',
    body: data,
  });
}

interface FetchRegistrationsParams {
  applicationId?: string;
  sealId?: string;
  registrarId?: string;
}

export function fetchRegistrations(
  params?: FetchRegistrationsParams
): Promise<SealRegistration[]> {
  const query = params ? buildQueryString(params as Record<string, unknown>) : '';
  return request<SealRegistration[]>(`/registrations${query}`);
}

interface CreateRegistrationData {
  applicationId: string;
  sealId: string;
  registrarId: string;
  registrarName: string;
  registrant: string;
  registrantDepartment: string;
  usageTime: string;
  photoEvidence?: string;
  remark?: string;
}

export function createRegistration(
  data: CreateRegistrationData
): Promise<SealRegistration> {
  return request<SealRegistration>('/registrations', {
    method: 'POST',
    body: data,
  });
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/stats/dashboard');
}

export { ApiError };
export type {
  FetchApplicationsParams,
  CreateApplicationData,
  FetchPendingApprovalsParams,
  ApproveRejectPayload,
  FetchSealsParams,
  CreateSealData,
  FetchRegistrationsParams,
  CreateRegistrationData,
  ApiResponse,
};
