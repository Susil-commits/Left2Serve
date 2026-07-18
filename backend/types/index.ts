export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  phone?: string | null;
  address?: string | null;
  organization?: string | null;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: Date | null;
  token_version: number;
  created_at: Date;
}

export interface FoodListing {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  quantity: number;
  unit: string;
  expiry_time: Date;
  location: string;
  image_url?: string | null;
  status: 'available' | 'reserved' | 'collected' | 'expired';
  created_at: Date;
}

export interface Reservation {
  id: number;
  food_listing_id: number;
  user_id: number; // Reserver (ngo/volunteer)
  quantity: number;
  status: 'pending' | 'approved' | 'collected' | 'cancelled';
  created_at: Date;
}

export interface Review {
  id: number;
  reviewer_id: number;
  reviewee_id: number;
  reservation_id?: number | null;
  rating: number;
  comment?: string | null;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        tv?: number;
      };
    }
  }
}
