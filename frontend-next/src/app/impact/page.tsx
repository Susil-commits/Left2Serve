import Link from 'next/link';
import { fetchImpactStats } from '@/lib/api';

export const metadata = {
  title: 'Environmental & Community Impact | Left2Serve',
  description: 'See the real-time metrics of meals rescued, food waste diverted, and carbon emissions reduced by the Left2Serve network.',
};

export default async function ImpactPage() {
  const stats = await fetchImpactStats();

  const metrics = [
    {
      title: 'Meals Rescued & Served',
      value: stats.total_meals_saved.toLocaleString(),
      description: 'Nutritious meals redirected from landfills to community kitchens and shelters.',
      emoji: '🍲',
      color: 'bg-red-50 text-red-600 border-red-100',
    },
    {
      title: 'CO₂ Emissions Prevented',
      value: `${(stats.co2_reduced_kg / 1000).toFixed(1)} MT`,
      description: 'Metric tonnes of greenhouse gas equivalents prevented through surplus diversion.',
      emoji: '🌱',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Active Food Donors',
      value: stats.active_donors.toLocaleString(),
      description: 'Restaurants, hotels, caterers, and venues donating quality surplus food.',
      emoji: '🏢',
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Total Donation Batches',
      value: stats.total_listings.toLocaleString(),
      description: 'Hyperlocal surplus listings created and dispatched on the platform.',
      emoji: '📦',
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-600">
          Real-Time Impact Metrics
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Turning Food Waste into Community Nutrition
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
          Every meal rescued is a direct reduction in landfill methane and an immediate resource for vulnerable families. Here is our live footprint.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {metrics.map((m) => (
          <div
            key={m.title}
            className={`p-6 rounded-3xl border ${m.color} flex flex-col justify-between shadow-xs`}
          >
            <div>
              <span className="text-4xl">{m.emoji}</span>
              <div className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {m.value}
              </div>
              <div className="mt-1 font-bold text-sm text-slate-800">{m.title}</div>
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              {m.description}
            </p>
          </div>
        ))}
      </div>

      {/* Impact Breakdown Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-16">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
            Why Hyperlocal Speed Matters in Food Rescue
          </h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Prepared surplus food from restaurants, weddings, and hotels has a strict safety and temperature window (typically 2 to 4 hours).
          </p>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Left2Serve is engineered for sub-minute matchmaking. Proximity watchlists, automated WhatsApp/SMS alerts, and real-time Socket.IO chat allow volunteer drivers and local shelter staff to pick up hot meals while quality and nutrition are at their peak.
          </p>

          <div className="mt-6 flex gap-4">
            <Link
              href="/listings"
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              Browse Active Drops
            </Link>
            <a
              href="http://localhost:3000/donor/create"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-colors"
            >
              Register as a Donor
            </a>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
          <h3 className="font-bold text-base text-slate-900">Environmental Savings Equivalent</h3>
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
            <span className="text-2xl">🚗</span>
            <div>
              <div className="text-xs font-bold text-slate-800">Vehicle Miles Avoided</div>
              <div className="text-xs text-slate-500">Equivalent to removing ~75,000 km of driving emissions</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
            <span className="text-2xl">💧</span>
            <div>
              <div className="text-xs font-bold text-slate-800">Freshwater Conserved</div>
              <div className="text-xs text-slate-500">Over 1.8M liters of agricultural water footprint saved</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs font-bold text-slate-800">Embodied Energy Recovered</div>
              <div className="text-xs text-slate-500">Recovers commercial refrigeration and cooking therms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

