import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, setAccessToken, silentRefresh } from "../lib/api";
import type { Currency } from "../lib/currency";

interface User {
  id: string;
  email: string;
  name: string;
  currency: Currency;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, currency?: Currency) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; currency?: Currency }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount via refresh cookie
  useEffect(() => {
    silentRefresh()
      .then(({ user: refreshUser }) => {
        setUser(refreshUser as User | null);
        // If refresh didn't return user, fetch it
        if (!refreshUser) {
          return api.get("/users/me").then(({ data: u }) => setUser(u.data));
        }
      })
      .catch(() => {
        // No valid session — stay logged out
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logout from the axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, currency?: Currency) => {
    const { data } = await api.post("/auth/register", { email, password, name, currency });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profileData: { name?: string; currency?: Currency }) => {
    const { data } = await api.patch("/users/me", profileData);
    setUser(data.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
