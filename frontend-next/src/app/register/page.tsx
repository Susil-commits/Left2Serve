'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const roleOptions = [
  {
    role: 'donor',
    label: 'Food Donor',
    icon: '🍲',
    desc: 'Restaurants, caterers, hotels, event organizers',
  },
  {
    role: 'ngo',
    label: 'NGO / Charity',
    icon: '🏢',
    desc: 'Shelters, community kitchens, food distribution centers',
  },
  {
    role: 'volunteer',
    label: 'Volunteer Driver',
    icon: '🚗',
    desc: 'Help transport and deliver surplus meals locally',
  },
];

export default function RegisterPage() {
  const [role, setRole] = useState<'donor' | 'ngo' | 'volunteer'>('donor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setSubmitting(false);
      return;
    }

    const res = await register({
      role,
      name,
      email,
      password,
      organization: organization || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });

    if (!res.success) {
      setError(res.error || 'Failed to register account');
      setSubmitting(false);
      return;
    }

    if (role === 'donor') {
      router.push('/donor/create');
    } else {
      router.push('/listings');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🍲</span>
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
              Left<span className="text-red-500">2</span>Serve
            </span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Join the hyperlocal network to rescue and redistribute surplus meals.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Your Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {roleOptions.map((opt) => {
                const isSelected = role === opt.role;
                return (
                  <button
                    type="button"
                    key={opt.role}
                    onClick={() => setRole(opt.role as typeof role)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-xl">{opt.icon}</div>
                    <div className="mt-1.5 font-bold text-xs text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {(role === 'donor' || role === 'ngo') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Organization / Business Name
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={role === 'donor' ? 'e.g. Bistro 108 or Grand Palace Hotel' : 'e.g. Hope Shelter Foundation'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password * (Min 8 Characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Base Address / City
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Koramangala, Bangalore"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50 mt-2"
          >
            {submitting ? 'Creating Account...' : 'Complete Registration →'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Already registered? </span>
          <Link href="/login" className="font-bold text-red-600 hover:text-red-700">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

