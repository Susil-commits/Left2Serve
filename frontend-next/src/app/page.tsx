import Link from 'next/link';
import { fetchListings, fetchImpactStats } from '@/lib/api';

export default async function Home() {
  const [listingsData, stats] = await Promise.all([
    fetchListings({ limit: 4 }),
    fetchImpactStats(),
  ]);

  const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50/60 to-white py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-6 tracking-wide shadow-xs">
            <span>✨</span>
            <span>{stats.total_meals_saved.toLocaleString()} Meals Rescued Across Communities</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Rescue Surplus Food.{' '}
            <span className="text-red-600 block sm:inline">Feed People, Not Landfills.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Left2Serve instantly connects restaurants, caterers, and events with local shelters, NGOs, and volunteer drivers to redistribute fresh food in minutes.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/listings"
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Browse Available Food →
            </Link>
            <a
              href={`${spaUrl}/donor/create`}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-2xl font-bold transition-all shadow-xs"
            >
              Donate Surplus as a Business
            </a>
          </div>

          <div className="mt-12 flex justify-center items-center gap-8 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Food Safety Checklist</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Proximity Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>QR Code Verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Surplus Drops Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Fresh & Ready</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Latest Food Drops Ready for Claim
            </h2>
          </div>
          <Link
            href="/listings"
            className="mt-3 sm:mt-0 text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            Explore all {listingsData.pagination.total} listings →
          </Link>
        </div>

        {listingsData.listings.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-600">
              No active surplus drops right now. Donors list new surplus regularly!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listingsData.listings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                    <span>{item.category}</span>
                    <span className="text-red-600 font-semibold">{item.remaining} {item.unit} left</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {item.description || 'Surplus meals prepared with verified food safety standards.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    📍 {item.pickup_address.split(',')[0]}
                  </span>
                  <Link
                    href={`/listings/${item.id}`}
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Claim →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it Works Pillars */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Three Steps from Kitchen to Community
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Built to minimize friction and save time during busy service hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-3xl">🍲</span>
              <h3 className="mt-4 font-bold text-base text-slate-900">1. Donor Lists Surplus</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Restaurants or caterers take 30 seconds to drop rough meal details. Gemini AI auto-generates appetizing descriptions, storage suggestions, and safety tags.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-3xl">⚡</span>
              <h3 className="mt-4 font-bold text-base text-slate-900">2. Proximity Matching</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Geospatial indexes match nearby registered shelters, NGOs, and volunteer watchlists. An instant push alert triggers reservation and pickup route planning.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-3xl">📱</span>
              <h3 className="mt-4 font-bold text-base text-slate-900">3. Safe Handshake & Verification</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                NGO or driver arrives, confirms safe packaging, and scans the dynamic QR code to securely log the handover and update community carbon impact metrics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
