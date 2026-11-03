import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🍲</span>
            <span className="font-extrabold text-xl text-white tracking-tight">
              Left<span className="text-red-500">2</span>Serve
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            A high-speed hyperlocal surplus food distribution network connecting food donors, NGOs, shelters, and volunteer drivers.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Discovery</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-white transition-colors">Browse Food Feed</Link></li>
            <li><Link href="/impact" className="hover:text-white transition-colors">Real-Time Impact</Link></li>
            <li><Link href="/listings?category=restaurant" className="hover:text-white transition-colors">Restaurant Surplus</Link></li>
            <li><Link href="/listings?category=event" className="hover:text-white transition-colors">Event & Catering</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Roles & Portals</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="http://localhost:3000/donor/create" className="hover:text-white transition-colors">Donor Portal</a></li>
            <li><a href="http://localhost:3000/dashboard/map" className="hover:text-white transition-colors">NGO Logistics Map</a></li>
            <li><a href="http://localhost:3000/volunteer" className="hover:text-white transition-colors">Volunteer Fleet</a></li>
            <li><a href="http://localhost:3000/admin" className="hover:text-white transition-colors">Audit & Admin</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Platform Architecture</h4>
          <p className="text-xs leading-relaxed text-slate-500 mb-2">
            Engineered with a high-performance Go (Gin) backend, distributed Redis Pub/Sub, PostGIS spatial indexing, and dual Next.js 15 SSR / React SPA clients.
          </p>
          <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-300 font-mono">
            Go 1.24 • Next.js 15
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-xs text-center text-slate-500">
        &copy; {new Date().getFullYear()} Left2Serve. Rescuing meals, feeding communities, zero waste.
      </div>
    </footer>
  );
}

