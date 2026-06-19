import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.auth.me().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => { const data = await api.auth.login({ email, password }); localStorage.setItem('token', data.token); setUser(data.user); return data.user; };
  const register = async (userData) => { const data = await api.auth.register(userData); localStorage.setItem('token', data.token); setUser(data.user); return data.user; };
  const adminLogin = async (adminCode) => { const data = await api.admin.login({ adminCode }); localStorage.setItem('token', data.token); setUser(data.user); return data.user; };
  const updateUser = async (userData) => { setUser(prev => ({ ...prev, ...userData })); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, adminLogin, updateUser, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}