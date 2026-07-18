import { get, all, run } from './database.js';
export async function getAvailability(listingId) {
    const listing = await get('SELECT quantity FROM food_listings WHERE id = ?', [listingId]);
    if (!listing)
        return { remaining: 0, active: 0, collected: 0, quantity: 0 };
    const [row] = await all(`SELECT
       COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN quantity ELSE 0 END), 0) AS active,
       COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity ELSE 0 END), 0) AS collected
     FROM reservations WHERE food_listing_id = ?`, [listingId]);
    const active = Number(row.active);
    const collected = Number(row.collected);
    const remaining = Math.max(0, Number(listing.quantity) - active - collected);
    return { remaining, active, collected, quantity: Number(listing.quantity) };
}
export async function recomputeListingStatus(listingId) {
    const listing = await get('SELECT id, quantity, status FROM food_listings WHERE id = ?', [listingId]);
    if (!listing)
        return;
    if (['expired', 'cancelled', 'collected'].includes(listing.status))
        return;
    const { remaining, active } = await getAvailability(listingId);
    let next;
    if (remaining > 0)
        next = 'available';
    else
        next = active > 0 ? 'reserved' : 'collected';
    if (next !== listing.status) {
        await run("UPDATE food_listings SET status = ? WHERE id = ? AND status NOT IN ('expired','cancelled','collected')", [next, listingId]);
    }
}
export const REMAINING_SQL = `(fl.quantity
  - COALESCE((SELECT SUM(quantity) FROM reservations WHERE food_listing_id = fl.id AND status IN ('pending','approved')), 0)
  - COALESCE((SELECT SUM(quantity) FROM reservations WHERE food_listing_id = fl.id AND status = 'collected'), 0))`;
