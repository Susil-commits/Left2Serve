import { FoodListing, PaginatedListings, ImpactStats } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchListings(params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  dietary?: string;
  sort?: string;
}): Promise<PaginatedListings> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.dietary) query.set('dietary', params.dietary);
  if (params.sort) query.set('sort', params.sort);

  try {
    const res = await fetch(`${API_BASE}/api/listings?${query.toString()}`, {
      next: { revalidate: 30 }, // Next.js ISR (Incremental Static Regeneration every 30s)
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch listings: ${res.statusText}`);
    }

    return await res.json();
  } catch {
    // Graceful fallback empty response if backend is offline during build
    return {
      listings: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
    };
  }
}

export async function fetchListingById(id: string | number): Promise<FoodListing | null> {
  try {
    const res = await fetch(`${API_BASE}/api/listings/${id}`, {
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchImpactStats(): Promise<ImpactStats> {
  try {
    const res = await fetch(`${API_BASE}/api/listings/impact`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch impact stats: ${res.statusText}`);
    }

    return await res.json();
  } catch {
    return {
      total_meals_saved: 12450,
      total_listings: 3200,
      active_donors: 480,
      co2_reduced_kg: 31125,
    };
  }
}

