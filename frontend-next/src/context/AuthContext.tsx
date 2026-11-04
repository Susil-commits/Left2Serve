'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  phone?: string;
  address?: string;
  organization?: string;
  is_active: boolean;
  avatar_url?: string;
  meals_saved: number;
  created_at: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'donor' | 'ngo' | 'volunteer';
  phone?: string;
  address?: string;
  organization?: string;
}

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<{ success: boolean; error?: string; requires2fa?: boolean }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setStoredToken = (tok: string | null) => {
    setToken(tok);
    if (typeof window !== 'undefined') {
      if (tok) {
        localStorage.setItem('token', tok);
        document.cookie = `left2serve_token=${tok}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
      } else {
        localStorage.removeItem('token');
        document.cookie = 'left2serve_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  };

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        setStoredToken(null);
        setUser(null);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, otp?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp: otp || '' }),
      });

      const data = await res.json();

      if (data.requires2fa) {
        return { success: false, requires2fa: true };
      }

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (data.token && data.user) {
        setStoredToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: 'Unexpected login response' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      if (data.token && data.user) {
        setStoredToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
