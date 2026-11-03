import Link from 'next/link';
import { fetchListings } from '@/lib/api';
import { FoodListing } from '@/types';

interface PageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    dietary?: string;
    sort?: string;
    page?: string;
  }>;
}

export const metadata = {
  title: 'Browse Surplus Food Listings | Left2Serve',
  description: 'Discover available surplus food donations from local restaurants, caterers, and events in your community.',
};

export default async function ListingsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1', 10);
  const category = searchParams.category || '';
  const search = searchParams.search || '';
  const dietary = searchParams.dietary || '';
  const sort = searchParams.sort || '';

  const data = await fetchListings({
    page,
    limit: 12,
    category,
    search,
    dietary,
    sort,
  });

  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'Restaurants', value: 'restaurant' },
    { label: 'Events & Weddings', value: 'event' },
    { label: 'Hotels', value: 'hotel' },
    { label: 'Caterers', value: 'caterer' },
    { label: 'Households', value: 'household' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Filter Bar */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Available Surplus Food
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          Fresh, surplus meals ready for immediate pickup and distribution.
        </p>

        {/* Filter categories pills */}
        <div className="mt-6 flex flex-wrap gap-2 items-center">
          {categories.map((cat) => {
            const isActive = category === cat.value;
            const query = new URLSearchParams();
            if (cat.value) query.set('category', cat.value);
            if (search) query.set('search', search);

            return (
              <Link
                key={cat.value}
                href={`/listings?${query.toString()}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grid of Food Listings */}
      {data.listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <span className="text-5xl">🍲</span>
          <h3 className="mt-4 text-lg font-bold text-slate-800">No active surplus listings right now</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Check back shortly or register a proximity watchlist to be alerted when a nearby donor drops surplus food.
          </p>
          <div className="mt-6">
            <a
              href="http://localhost:3000/donor/create"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm shadow hover:bg-red-600 transition-colors"
            >
              List Surplus Food as a Donor
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.listings.map((item: FoodListing) => {
            const hasImages = item.image_urls && item.image_urls.length > 0;
            const imgUrl = hasImages ? item.image_urls[0] : null;
            const expiry = new Date(item.expiry_date);
            const isExpiringSoon = expiry.getTime() - Date.now() < 3 * 3600 * 1000;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Image / Header */}
                <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-slate-300 select-none">🍲</span>
                  )}

                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur">
                      {item.category}
                    </span>
                    {item.has_safety_checklist && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
                        ✓ Safety Verified
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-900 shadow">
                      {item.remaining} {item.unit} left
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {item.description || 'Freshly prepared surplus food ready for claim.'}
                    </p>

                    {/* Donor org */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span>🏢</span>
                      <span className="truncate">{item.donor_org || item.donor_name || 'Verified Donor'}</span>
                    </div>

                    {/* Dietary tags */}
                    {item.dietary_preferences && item.dietary_preferences.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.dietary_preferences.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expiry & CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className={isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                      ⏰ Expires {expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <Link
                      href={`/listings/${item.id}`}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-colors"
                    >
                      View & Claim →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data.pagination.totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-2">
          {page > 1 && (
            <Link
              href={`/listings?page=${page - 1}${category ? `&category=${category}` : ''}`}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Previous
            </Link>
          )}
          <span className="text-xs text-slate-500 font-medium px-2">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          {page < data.pagination.totalPages && (
            <Link
              href={`/listings?page=${page + 1}${category ? `&category=${category}` : ''}`}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

