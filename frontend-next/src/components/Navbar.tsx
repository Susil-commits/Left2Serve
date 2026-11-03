import Link from 'next/link';

export function Navbar() {
  const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';

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
          <a
            href={`${spaUrl}/login`}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign In
          </a>
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

