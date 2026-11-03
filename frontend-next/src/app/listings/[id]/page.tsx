import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchListingById } from '@/lib/api';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const listing = await fetchListingById(params.id);

  if (!listing) {
    return {
      title: 'Listing Not Found | Left2Serve',
    };
  }

  const images = listing.image_urls && listing.image_urls.length > 0 ? [listing.image_urls[0]] : [];

  return {
    title: `${listing.title} | Surplus Food Listing | Left2Serve`,
    description: listing.description || `Available surplus food: ${listing.quantity} ${listing.unit} ready for pickup in ${listing.pickup_address}.`,
    openGraph: {
      title: `${listing.title} - ${listing.remaining} ${listing.unit} Available`,
      description: listing.description || 'Rescue surplus meals on Left2Serve.',
      images,
    },
  };
}

export default async function ListingDetailPage(props: PageProps) {
  const params = await props.params;
  const listing = await fetchListingById(params.id);

  if (!listing) {
    notFound();
  }

  const expiry = new Date(listing.expiry_date);
  const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';
  const hasImages = listing.image_urls && listing.image_urls.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/listings" className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
          ← Back to all listings
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2">
        {/* Media / Gallery */}
        <div className="bg-slate-100 flex items-center justify-center min-h-[320px] p-4 relative">
          {hasImages ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_urls[0]}
              alt={listing.title}
              className="w-full h-full max-h-[420px] object-cover rounded-2xl shadow-xs"
            />
          ) : (
            <div className="text-center py-20">
              <span className="text-7xl">🍲</span>
              <p className="mt-3 text-xs text-slate-400 font-medium">No donor photos uploaded</p>
            </div>
          )}

          <div className="absolute top-6 left-6">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur">
              {listing.category}
            </span>
          </div>
        </div>

        {/* Details & Action */}
        <div className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                {listing.remaining} {listing.unit} Available
              </span>
              <span className="text-xs text-slate-500">
                Posted {new Date(listing.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {listing.title}
            </h1>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {listing.description || 'No additional donor description provided.'}
            </p>

            {/* Dietary Tags */}
            {listing.dietary_preferences && listing.dietary_preferences.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {listing.dietary_preferences.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    🏷️ {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Donor & Safety Info */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-base">🏢</span>
                <div>
                  <div className="font-semibold text-slate-800">Donor Organization</div>
                  <div className="text-xs text-slate-500">{listing.donor_org || listing.donor_name || 'Verified Community Donor'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-base">📍</span>
                <div>
                  <div className="font-semibold text-slate-800">Pickup Location</div>
                  <div className="text-xs text-slate-500">{listing.pickup_address}</div>
                </div>
              </div>

              {listing.pickup_instructions && (
                <div className="flex items-start gap-2.5">
                  <span className="text-base">📝</span>
                  <div>
                    <div className="font-semibold text-slate-800">Instructions</div>
                    <div className="text-xs text-slate-500">{listing.pickup_instructions}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <span className="text-base">⏰</span>
                <div>
                  <div className="font-semibold text-slate-800">Pickup Expiry Window</div>
                  <div className="text-xs text-amber-700 font-medium">
                    Valid until {expiry.toLocaleDateString()} at {expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {listing.has_safety_checklist && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                  <span>✓</span>
                  <span>Donor completed food handling, temperature, and packaging safety checklist.</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <a
              href={`${spaUrl}/listings/${listing.id}`}
              className="w-full inline-flex justify-center items-center py-3.5 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base shadow-md transition-all transform hover:-translate-y-0.5 text-center"
            >
              Claim Food in Interactive Console →
            </a>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Opens the verification and real-time pickup coordination portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

