export interface FoodListing {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: 'event' | 'restaurant' | 'hotel' | 'caterer' | 'household';
  quantity: number;
  remaining: number;
  unit: string;
  price: number;
  expiry_date: string;
  pickup_address: string;
  pickup_instructions?: string;
  image_urls: string[];
  dietary_preferences: string[];
  status: 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled';
  created_at: string;
  latitude?: number;
  longitude?: number;
  has_safety_checklist: boolean;
  donor_name?: string;
  donor_org?: string;
  distance_km?: number;
}

export interface PaginatedListings {
  listings: FoodListing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImpactStats {
  total_meals_saved: number;
  total_listings: number;
  active_donors: number;
  co2_reduced_kg: number;
}

