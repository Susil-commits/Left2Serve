import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-accent mb-2">Invalid Link</h2>
        <p className="text-subtle mb-4">No reset token was provided in the URL.</p>
        <Link to="/login" className="btn-primary">Go to Login</Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white relative page-transition">
      <div className="absolute inset-0 pattern-dots opacity-30" />
      <div className="relative w-full max-w-md mx-4 animate-scale-in">
        <div className="premium-card-elevated p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text">Reset Password</h2>
            <p className="text-subtle text-sm mt-2">Enter your new password below.</p>
          </div>
          
          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-4 text-sm font-medium text-center">
              Password has been successfully reset! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl text-sm flex items-start gap-3 font-medium">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-text mb-2">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="input-field" placeholder="Enter new password" minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="input-field" placeholder="Confirm new password" minLength={8} />
              </div>
              
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-2xl text-base mt-2">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
