import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies on every request
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Shared refresh lock — prevents concurrent refresh calls from racing
let refreshPromise: Promise<{ accessToken: string; user: unknown }> | null = null;

/**
 * Call POST /auth/refresh exactly once at a time.
 * All concurrent callers share the same in-flight promise.
 */
export function silentRefresh(): Promise<{ accessToken: string; user: unknown }> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then(({ data }) => {
      const newToken: string = data.data.accessToken;
      setAccessToken(newToken);
      return { accessToken: newToken, user: data.data.user ?? null };
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Silent refresh on 401
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { accessToken } = await silentRefresh();
      refreshQueue.forEach(({ resolve }) => resolve(accessToken));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      refreshQueue.forEach(({ reject }) => reject(refreshError));
      refreshQueue = [];
      setAccessToken(null);
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

// In-memory token store (never persisted to localStorage)
let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}
