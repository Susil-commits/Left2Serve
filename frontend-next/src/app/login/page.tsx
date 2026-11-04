'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const { login } = useAuth();
  const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await login(email, password, requires2fa ? otp : undefined);

    if (res.requires2fa) {
      setRequires2fa(true);
      setError('Two-Factor Authentication code required. Please enter your 6-digit authenticator OTP.');
      setSubmitting(false);
      return;
    }

    if (!res.success) {
      setError(res.error || 'Invalid email or password');
      setSubmitting(false);
      return;
    }

    // Success -> redirect
    router.push('/listings');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🍲</span>
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
              Left<span className="text-red-500">2</span>Serve
            </span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to rescue surplus meals or coordinate local distribution.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <a
                href={`${spaUrl}/reset-password`}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Forgot?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {requires2fa && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-1.5">
                Authenticator 6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl border border-amber-300 text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {submitting ? 'Verifying Account...' : 'Sign In →'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>New to Left2Serve? </span>
          <Link href="/register" className="font-bold text-red-600 hover:text-red-700">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
