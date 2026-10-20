import { auth } from './firebase.ts';

async function getAuthHeader(): Promise<HeadersInit> {
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
