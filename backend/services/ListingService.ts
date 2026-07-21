import { get, all, insert } from '../db/database.js';
import { REMAINING_SQL } from '../db/availability.js';
import { createNotification } from '../db/notify.js';

export class ListingService {
  static withRemaining(l: any) {
    const obj = { ...l, image_urls: l.image_urls || [] };
    if (obj.remaining == null) obj.remaining = Number(l.quantity) || 0;
    else obj.remaining = Number(obj.remaining);
    return obj;
  }

  static async getAllListings(queryOptions: any) {
    const { category, status, search, sort, dietary, page = 1, limit = 12, lat, lng, distance } = queryOptions;
    
    let query = `SELECT fl.*, u.name as donor_name, u.organization as donor_org, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM food_listings fl WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (lat && lng && distance) {
      const radius = Number(distance);
      if (!isNaN(Number(lat)) && !isNaN(Number(lng)) && !isNaN(radius)) {
        const mysqlDistanceSql = `( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(?)) * cos(radians(fl.latitude)) * cos(radians(fl.longitude) - radians(?)) + sin(radians(?)) * sin(radians(fl.latitude))))) )`;
        query += ` AND ${mysqlDistanceSql} <= ?`;
        countQuery += ` AND ${mysqlDistanceSql} <= ?`;
        params.push(Number(lat), Number(lng), Number(lat), radius);
        countParams.push(Number(lat), Number(lng), Number(lat), radius);
      }
    }

    if (category) { query += ' AND fl.category = ?'; countQuery += ' AND fl.category = ?'; params.push(category); countParams.push(category); }
    
    if (dietary) {
      const tags = String(dietary).split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        query += ' AND fl.dietary_preferences @> ?::jsonb';
        countQuery += ' AND fl.dietary_preferences @> ?::jsonb';
        const jsonStr = JSON.stringify(tags);
        params.push(jsonStr);
        countParams.push(jsonStr);
      }
    }

    if (status) {
      query += ' AND fl.status = ?'; countQuery += ' AND fl.status = ?'; params.push(status); countParams.push(status);
    } else {
      query += " AND fl.status = 'available' AND fl.expiry_date > NOW()";
      countQuery += " AND fl.status = 'available' AND fl.expiry_date > NOW()";
    }
    
    if (search) {
      const tsQuery = String(search).trim().split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');
      if (tsQuery) {
        const vectorSql = "to_tsvector('english', fl.title || ' ' || COALESCE(fl.description, '') || ' ' || fl.category)";
        query += ` AND ${vectorSql} @@ to_tsquery('english', ?)`;
        countQuery += ` AND ${vectorSql} @@ to_tsquery('english', ?)`;
        params.push(tsQuery);
        countParams.push(tsQuery);
      }
    }

    const orderBy = sort === 'expiring' ? 'fl.expiry_date ASC' : sort === 'quantity' ? 'fl.quantity DESC, fl.created_at DESC' : 'fl.created_at DESC';
    const offset = (page - 1) * limit;
    query += ` ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    
    const [listings, countRow] = await Promise.all([all(query, params), get(countQuery, countParams)]);
    const total = countRow ? countRow.total : 0;
    
    return {
      listings: listings.map(this.withRemaining),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  static async createListing(userId: number, data: any) {
    const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, latitude, longitude } = data;
    const qty = Number(quantity);
    const dietaryTags = Array.isArray(dietary_preferences) ? dietary_preferences : [];
    const lat = latitude ? Number(latitude) : null;
    const lng = longitude ? Number(longitude) : null;
    
    const id = await insert(`INSERT INTO food_listings (user_id, title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [userId, String(title).trim(), description || null, category, qty, unit || 'servings', price || 0, expiry_date, String(pickup_address).trim(), pickup_instructions || null, JSON.stringify(image_urls), JSON.stringify(dietaryTags), lat, lng]
    );
    
    const listing = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [id]);
    
    // Trigger Smart Alerts
    if (lat !== null && lng !== null) {
      const searchStr = `${title} ${description || ''} ${category}`;
      const watchers = await all(`
        SELECT user_id, keyword FROM watchlists 
        WHERE user_id != ? 
        AND (keyword IS NULL OR keyword = '' OR ? ILIKE '%' || keyword || '%')
        AND ( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) ) <= radius_km
      `, [userId, searchStr, lat, lng, lat]);
      
      for (const w of watchers) {
        await createNotification(
          w.user_id,
          'watchlist_alert',
          'New Food Alert!',
          `A new listing "${title}" matches your watchlist criteria!`,
          { listingId: id, keyword: w.keyword }
        );
      }
    }
    
    const finalListing = this.withRemaining(listing);

    try {
      const { io } = await import('../server.js');
      io.emit('new_listing', finalListing);
    } catch (err) {
      console.error('Failed to emit new_listing event:', err);
    }

    return finalListing;
  }
}
