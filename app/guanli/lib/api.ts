import type { ApiEnvelope, DashboardSummary, GuanliSession } from '../types';

const API_BASE = '/api';
const DEFAULT_TIMEOUT = 15000;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = RequestInit & { timeout?: number };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, headers, ...init } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('guanli_token') : null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const text = await response.text();
    let payload: ApiEnvelope<T> | T | null = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

    if (!response.ok) {
      const message = typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message || payload.error || response.statusText)
        : response.statusText;
      throw new ApiError(message || '请求失败', response.status);
    }

    if (payload && typeof payload === 'object' && ('code' in payload || 'success' in payload)) {
      const envelope = payload as ApiEnvelope<T>;
      if (envelope.code !== undefined && envelope.code !== 200) {
        throw new ApiError(envelope.message || envelope.error || '请求失败', envelope.code);
      }
      if (envelope.success === false) {
        throw new ApiError(envelope.message || envelope.error || '请求失败', response.status);
      }
      return (envelope.data === undefined ? envelope as unknown as T : envelope.data);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 408);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function login(username: string, password: string, loginType = 'admin'): Promise<GuanliSession> {
  const response = await request<{ token: string; userId: number | string; username: string; companyName: string; role?: string; landlordId?: number | null }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, loginType }),
  });

  const role = response.role || (loginType === 'admin' ? 'admin' : 'landlord');
  return { ...response, role: role as GuanliSession['role'] };
}

export function getDashboardSummary() {
  return request<DashboardSummary>('/dashboard/landlord');
}

export function getAllData() {
  return request<Record<string, unknown>>('/data');
}

export function getExpiringCustomers() {
  return request<unknown[]>('/dashboard/expiring');
}

export function getPendingTickets() {
  return request<unknown[]>('/workorder/pending');
}
