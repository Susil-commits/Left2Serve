import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function Login() {
  const [searchParams] = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';
  const isExpired = searchParams.get('expired') === 'true';
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const prefillEmail = isRegistered ? sessionStorage.getItem('prefill_email') || '' : '';
  const prefillPassword = isRegistered ? sessionStorage.getItem('prefill_password') || '' : '';
  if (isRegistered) {
    sessionStorage.removeItem('prefill_email');
    sessionStorage.removeItem('prefill_password');
  }

  const [mode, setMode] = useState('user');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState(prefillPassword);
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg] = useState(isRegistered ? 'Account created successfully! Please sign in.' : (isExpired ? 'Your session has expired. Please sign in again.' : ''));
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(adminCode);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white relative page-transition">
      <div className="absolute inset-0 pattern-dots opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />
      <div className="relative w-full max-w-md mx-4 animate-scale-in">
        <div className="premium-card-elevated p-8">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-lg mx-auto shadow-red hover-glow transition-all">L2</div>
            </Link>
            <h2 className="text-2xl font-bold text-text">
              {mode === 'user' ? 'Welcome Back' : 'Admin Access'}
            </h2>
            <p className="text-subtle text-sm mt-2">
              {mode === 'user' ? 'Sign in to your account' : 'Enter admin authorization code'}
            </p>
          </div>

          {successMsg && mode === 'user' && (
            <div className={`p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium border ${
              isExpired ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {isExpired ? (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {successMsg}
            </div>
          )}

          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('user'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === 'user' ? 'bg-white text-text shadow-sm' : 'text-subtle hover:text-text'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                User
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === 'admin' ? 'bg-white text-text shadow-sm' : 'text-subtle hover:text-text'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Admin
              </span>
            </button>
          </div>

          {error && (
            <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </div>
          )}

          {mode === 'user' ? (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Email address</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field pl-14" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Password</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field pl-14" placeholder="Enter your password" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span> : 'Sign In'}
              </button>
              <p className="text-center text-sm text-muted pt-2">Don't have an account? <Link to="/register" className="text-accent hover:text-accent-dark font-semibold transition-colors">Create one</Link></p>
              <p className="text-center text-xs text-muted"><Link to="/" className="hover:text-accent transition-colors">← Back to home</Link></p>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Admin code</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)} required className="input-field pl-14" placeholder="Enter admin authorization code" autoFocus />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating...</span> : 'Access Admin Panel'}
              </button>
              <p className="text-center text-xs text-muted pt-2">Authorized personnel only</p>
              <p className="text-center text-xs text-muted"><Link to="/" className="hover:text-accent transition-colors">← Back to home</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}