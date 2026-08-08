import { get, all, insert } from '../db/database.js';
import { REMAINING_SQL } from '../db/availability.js';
import { createNotification } from '../db/notify.js';
export class ListingService {
    static withRemaining(l) {
        const obj = { ...l, image_urls: l.image_urls || [] };
        if (obj.remaining == null)
            obj.remaining = Number(l.quantity) || 0;
        else
            obj.remaining = Number(obj.remaining);
        return obj;
    }
    static async getAllListings(queryOptions) {
        const { category, status, search, sort, dietary, page = 1, limit = 12, lat, lng, distance } = queryOptions;
        let selectCols = `fl.*, u.name as donor_name, u.organization as donor_org, GREATEST(${REMAINING_SQL}, 0) AS remaining`;
        const params = [];
        const countParams = [];
        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            const mysqlDistanceSql = `( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(${Number(lat)})) * cos(radians(fl.latitude)) * cos(radians(fl.longitude) - radians(${Number(lng)})) + sin(radians(${Number(lat)})) * sin(radians(fl.latitude))))) )`;
            selectCols += `, ${mysqlDistanceSql} AS distance_km`;
        }
        let query = `SELECT ${selectCols} FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.is_template = false`;
        let countQuery = `SELECT COUNT(*) as total FROM food_listings fl WHERE fl.is_template = false`;
        if (lat && lng && distance) {
            const radius = Number(distance);
            if (!isNaN(Number(lat)) && !isNaN(Number(lng)) && !isNaN(radius)) {
                // Bounding box pre-filter
                const latDelta = radius / 111.045;
                const lngDelta = radius / (111.045 * Math.cos(Number(lat) * (Math.PI / 180)));
                const minLat = Number(lat) - latDelta;
                const maxLat = Number(lat) + latDelta;
                const minLng = Number(lng) - lngDelta;
                const maxLng = Number(lng) + lngDelta;
                query += ` AND fl.latitude BETWEEN ? AND ? AND fl.longitude BETWEEN ? AND ?`;
                countQuery += ` AND fl.latitude BETWEEN ? AND ? AND fl.longitude BETWEEN ? AND ?`;
                params.push(minLat, maxLat, minLng, maxLng);
                countParams.push(minLat, maxLat, minLng, maxLng);
                // Exact distance check
                const mysqlDistanceSql = `( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(?)) * cos(radians(fl.latitude)) * cos(radians(fl.longitude) - radians(?)) + sin(radians(?)) * sin(radians(fl.latitude))))) )`;
                query += ` AND ${mysqlDistanceSql} <= ?`;
                countQuery += ` AND ${mysqlDistanceSql} <= ?`;
                params.push(Number(lat), Number(lng), Number(lat), radius);
                countParams.push(Number(lat), Number(lng), Number(lat), radius);
            }
        }
        if (category) {
            query += ' AND fl.category = ?';
            countQuery += ' AND fl.category = ?';
            params.push(category);
            countParams.push(category);
        }
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
            query += ' AND fl.status = ?';
            countQuery += ' AND fl.status = ?';
            params.push(status);
            countParams.push(status);
        }
        else {
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
    static async createListing(userId, data) {
        const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, latitude, longitude, has_safety_checklist, is_template } = data;
        const qty = Number(quantity);
        const dietaryTags = Array.isArray(dietary_preferences) ? dietary_preferences : [];
        const lat = latitude ? Number(latitude) : null;
        const lng = longitude ? Number(longitude) : null;
        const id = await insert(`INSERT INTO food_listings (user_id, title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, latitude, longitude, has_safety_checklist, is_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, String(title).trim(), description || null, category, qty, unit || 'servings', price || 0, expiry_date, String(pickup_address).trim(), pickup_instructions || null, JSON.stringify(image_urls), JSON.stringify(dietaryTags), lat, lng, !!has_safety_checklist, !!is_template]);
        const listing = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [id]);
        // Smart Alert trigger
        if (lat !== null && lng !== null && !is_template) {
            const searchStr = `${title} ${description || ''} ${category}`;
            const watchers = await all(`
        SELECT user_id, keyword FROM watchlists 
        WHERE user_id != ? 
        AND (keyword IS NULL OR keyword = '' OR ? ILIKE '%' || keyword || '%')
        AND ( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) ) <= radius_km
      `, [userId, searchStr, lat, lng, lat]);
            for (const w of watchers) {
                await createNotification(w.user_id, 'watchlist_alert', 'New Food Alert!', `A new listing "${title}" matches your watchlist criteria!`, { listingId: id, keyword: w.keyword });
            }
        }
        const finalListing = this.withRemaining(listing);
        try {
            const { io } = await import('../server.js');
            io.emit('new_listing', finalListing);
        }
        catch (err) {
            console.error('Failed to emit new_listing event:', err);
        }
        return finalListing;
    }
    static async getAnalyticsMe(userId) {
        const monthlyStats = await all(`
      SELECT 
        TO_CHAR(r.updated_at, 'YYYY-MM') as month,
        SUM(r.quantity) as meals_saved
      FROM reservations r
      JOIN food_listings fl ON r.food_listing_id = fl.id
      WHERE fl.user_id = ? AND r.status = 'collected'
      GROUP BY TO_CHAR(r.updated_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [userId]);
        const [totalListings] = await all('SELECT COUNT(*) as count FROM food_listings WHERE user_id = ?', [userId]);
        const [totalDonated] = await all("SELECT COALESCE(SUM(r.quantity), 0) as count FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id WHERE fl.user_id = ? AND r.status = 'collected'", [userId]);
        return {
            monthlyStats,
            totalListings: totalListings?.count || 0,
            totalDonated: totalDonated?.count || 0
        };
    }
    static async getMine(userId) {
        const listings = await all(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.user_id = ? AND fl.is_template = false ORDER BY fl.created_at DESC`, [userId]);
        return listings.map(l => this.withRemaining(l));
    }
    static async getTemplates(userId) {
        return await all(`SELECT * FROM food_listings WHERE user_id = ? AND is_template = true ORDER BY created_at DESC`, [userId]);
    }
    static async getStats() {
        const [listingsRow] = await all("SELECT COUNT(*) as count FROM food_listings WHERE status = 'available'");
        const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
        const [receiversRow] = await all("SELECT COUNT(*) as count FROM users WHERE role IN ('ngo','volunteer')");
        const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) as total FROM reservations WHERE status = 'collected'");
        return {
            activeListings: listingsRow.count,
            totalDonors: donorsRow.count,
            totalReceivers: receiversRow.count,
            mealsSaved: mealsRow.total,
        };
    }
    static async getImpactStats() {
        const [mealsRow] = await all("SELECT COALESCE(SUM(quantity), 0) as total FROM reservations WHERE status = 'collected'");
        const [listingsRow] = await all('SELECT COUNT(*) as count FROM food_listings');
        const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
        const [receiversRow] = await all("SELECT COUNT(*) as count FROM users WHERE role IN ('ngo','volunteer')");
        const meals = Number(mealsRow.total) || 0;
        const co2Kg = Math.round(meals * 2.5);
        return {
            mealsSaved: meals,
            co2Kg,
            trees: Math.round((co2Kg / 21) * 10) / 10,
            waterLiters: meals * 1250,
            totalListings: listingsRow.count,
            totalDonors: donorsRow.count,
            totalReceivers: receiversRow.count,
        };
    }
    static async getOne(id, user) {
        const listing = await get(`SELECT fl.*, u.name as donor_name, u.organization as donor_org, u.phone as donor_phone, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.id = ?`, [id]);
        if (!listing)
            return null;
        const out = this.withRemaining(listing);
        const isOwner = user && user.id === listing.user_id;
        const isAdmin = user && user.role === 'admin';
        let canSeeDonorContact = isOwner || isAdmin;
        if (!canSeeDonorContact && user && (user.role === 'ngo' || user.role === 'volunteer')) {
            const [r] = await all("SELECT id FROM reservations WHERE food_listing_id = ? AND user_id = ? AND status IN ('approved','collected')", [listing.id, user.id]);
            if (r)
                canSeeDonorContact = true;
        }
        if (!canSeeDonorContact)
            delete out.donor_phone;
        return out;
    }
    static async updateListing(id, userId, data) {
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [id]);
        if (!listing)
            throw new Error('NOT_FOUND');
        if (listing.user_id !== userId)
            throw new Error('NOT_AUTHORIZED');
        if (['expired', 'collected', 'cancelled'].includes(listing.status)) {
            throw new Error('CLOSED');
        }
        const { title, description, category, quantity, unit, price, expiry_date, pickup_address, pickup_instructions, image_urls, dietary_preferences, status, latitude, longitude } = data;
        const nextCategory = category || listing.category;
        const nextQty = quantity != null ? Number(quantity) : listing.quantity;
        const nextExpiry = expiry_date || listing.expiry_date;
        const existingImageUrls = (() => {
            if (Array.isArray(listing.image_urls))
                return listing.image_urls;
            try {
                return JSON.parse(listing.image_urls);
            }
            catch {
                return [];
            }
        })();
        const images = image_urls !== undefined ? image_urls : existingImageUrls;
        const dietaryTags = dietary_preferences !== undefined ? (Array.isArray(dietary_preferences) ? dietary_preferences : []) : listing.dietary_preferences;
        const lat = latitude !== undefined ? (latitude ? Number(latitude) : null) : listing.latitude;
        const lng = longitude !== undefined ? (longitude ? Number(longitude) : null) : listing.longitude;
        // Dynamic DB import
        const { run } = await import('../db/database.js');
        const { recomputeListingStatus } = await import('../db/availability.js');
        await run(`UPDATE food_listings SET title=?, description=?, category=?, quantity=?, unit=?, price=?, expiry_date=?, pickup_address=?, pickup_instructions=?, image_urls=?, dietary_preferences=?, status=?, latitude=?, longitude=? WHERE id=?`, [title ? String(title).trim() : listing.title, description ?? listing.description, nextCategory, nextQty, unit || listing.unit, price ?? listing.price, nextExpiry, pickup_address ? String(pickup_address).trim() : listing.pickup_address, pickup_instructions ?? listing.pickup_instructions, JSON.stringify(images), JSON.stringify(dietaryTags), status || listing.status, lat, lng, id]);
        await recomputeListingStatus(id);
        const updated = await get(`SELECT fl.*, GREATEST(${REMAINING_SQL}, 0) AS remaining FROM food_listings fl WHERE fl.id = ?`, [id]);
        return this.withRemaining(updated);
    }
    static async deleteListing(id, userId) {
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [id]);
        if (!listing)
            throw new Error('NOT_FOUND');
        if (listing.user_id !== userId)
            throw new Error('NOT_AUTHORIZED');
        const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [id]);
        if (active.count > 0)
            throw new Error('ACTIVE_RESERVATIONS');
        const { run } = await import('../db/database.js');
        await run('DELETE FROM food_listings WHERE id = ?', [id]);
    }
    static async closeListing(id, userId) {
        const listing = await get('SELECT * FROM food_listings WHERE id = ?', [id]);
        if (!listing)
            throw new Error('NOT_FOUND');
        if (listing.user_id !== userId)
            throw new Error('NOT_AUTHORIZED');
        if (['collected', 'expired', 'cancelled'].includes(listing.status))
            throw new Error('ALREADY_CLOSED');
        const [active] = await all("SELECT COUNT(*) as count FROM reservations WHERE food_listing_id = ? AND status IN ('pending','approved')", [id]);
        if (active.count > 0)
            throw new Error('ACTIVE_RESERVATIONS');
        const { run } = await import('../db/database.js');
        await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [id]);
    }
}
