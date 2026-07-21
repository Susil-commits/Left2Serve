import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.auth.me().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        if (!e.newValue) setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem('token');
      setUser(null);
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        navigate('/login?expired=1', { replace: true });
      }
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [navigate, location.pathname]);

  const login = async (email, password, otp) => { const data = await api.auth.login({ email, password, otp }); if (data.requires2fa) return data; localStorage.setItem('token', data.token); setUser(data.user); return data; };
  const register = async (userData) => { const data = await api.auth.register(userData); localStorage.setItem('token', data.token); setUser(data.user); return data.user; };
  const adminLogin = async (adminCode) => { const data = await api.admin.login({ adminCode }); localStorage.setItem('token', data.token); setUser(data.user); return data.user; };
  const updateUser = async (userData) => { setUser(prev => ({ ...prev, ...userData })); };
  const changePassword = async (body) => { const data = await api.auth.changePassword(body); if (data.token) localStorage.setItem('token', data.token); return data; };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, adminLogin, updateUser, changePassword, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}