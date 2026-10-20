import { auth } from './firebase.ts';

let inMemoryAdminToken: string | null = null;

try {
  inMemoryAdminToken = sessionStorage.getItem('ffc_admin_token');
} catch (e) {
  // Ignore in environments where sessionStorage is unavailable
}

export function setAdminSessionToken(token: string | null) {
  inMemoryAdminToken = token;
  try {
    if (token) {
      sessionStorage.setItem('ffc_admin_token', token);
    } else {
      sessionStorage.removeItem('ffc_admin_token');
    }
  } catch (e) {}
}

export function getAdminSessionToken(): string | null {
  return inMemoryAdminToken;
}

async function getAuthHeader(): Promise<HeadersInit> {
  // 1. Check custom signed admin token
  if (inMemoryAdminToken) {
    return { Authorization: `Bearer ${inMemoryAdminToken}` };
  }

  // 2. Check Firebase User ID Token
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch (e) {
      console.warn('Failed to get user ID token:', e);
    }
  }

  return {};
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader,
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}
