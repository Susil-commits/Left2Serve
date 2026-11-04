'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';

  const roleColors: Record<string, string> = {
    donor: 'bg-emerald-100 text-emerald-800',
    ngo: 'bg-blue-100 text-blue-800',
    volunteer: 'bg-amber-100 text-amber-800',
    admin: 'bg-purple-100 text-purple-800',
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍲</span>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Left<span className="text-red-500">2</span>Serve
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/listings" className="hover:text-red-600 transition-colors">
              Browse Surplus
            </Link>
            <Link href="/impact" className="hover:text-red-600 transition-colors">
              Live Impact
            </Link>
            <a href={`${spaUrl}/dashboard/map`} className="hover:text-red-600 transition-colors flex items-center gap-1">
              <span>Interactive Map</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-normal">SPA</span>
            </a>
            <a href={`${spaUrl}/community/forum`} className="hover:text-red-600 transition-colors flex items-center gap-1">
              <span>Community</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-normal">SPA</span>
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-bold text-slate-800 leading-tight">{user.name}</div>
                  <span className={`inline-block px-1.5 py-0.2 rounded-md text-[10px] font-semibold uppercase ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
                    {user.role}
                  </span>
                </div>
                <span className="text-xs text-slate-400">▾</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-lg py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-semibold text-slate-800">{user.email}</div>
                    {user.organization && (
                      <div className="text-[10px] text-slate-500 truncate">{user.organization}</div>
                    )}
                  </div>

                  <a
                    href={`${spaUrl}/dashboard`}
                    className="block px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    onClick={() => setDropdownOpen(false)}
                  >
                    📊 Role Dashboard
                  </a>
                  <a
                    href={`${spaUrl}/profile`}
                    className="block px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    onClick={() => setDropdownOpen(false)}
                  >
                    ⚙️ Account Settings
                  </a>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-semibold"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-block text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Register
              </Link>
            </>
          )}

          <Link
            href="/donor/create"
            className="text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            Donate Food
          </Link>
        </div>
      </div>
    </header>
  );
}
