import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { get, all, run } from '../db/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();
const ADMIN_CODE = 'admlogin8984';

router.post('/login', async (req, res) => {
  const { adminCode } = req.body;
  if (!adminCode) return res.status(400).json({ error: 'Admin code is required' });
  if (adminCode !== ADMIN_CODE) return res.status(401).json({ error: 'Invalid admin code' });
  const token = jwt.sign({ id: 0, role: 'admin', adminCode }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: 0, name: 'Administrator', email: 'admin@left2serve.com', role: 'admin' } });
});

router.get('/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [usersRow] = await all('SELECT COUNT(*) as count FROM users');
    const [ngosRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'ngo'");
    const [donorsRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
    const [volunteersRow] = await all("SELECT COUNT(*) as count FROM users WHERE role = 'volunteer'");
    const [listingsRow] = await all('SELECT COUNT(*) as count FROM food_listings');
    const [activeListingsRow] = await all("SELECT COUNT(*) as count FROM food_listings WHERE status = 'available'");
    const [reservationsRow] = await all('SELECT COUNT(*) as count FROM reservations');
    const [pendingReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'");
    const [approvedReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'approved'");
    const [collectedReservationsRow] = await all("SELECT COUNT(*) as count FROM reservations WHERE status = 'collected'");
    res.json({
      totalUsers: usersRow.count,
      totalNgos: ngosRow.count,
      totalDonors: donorsRow.count,
      totalVolunteers: volunteersRow.count,
      totalListings: listingsRow.count,
      activeListings: activeListingsRow.count,
      totalReservations: reservationsRow.count,
      pendingReservations: pendingReservationsRow.count,
      approvedReservations: approvedReservationsRow.count,
      collectedReservations: collectedReservationsRow.count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await all('SELECT id, name, email, role, phone, address, organization, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/ngos', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const ngos = await all("SELECT id, name, email, phone, address, organization, created_at FROM users WHERE role = 'ngo' ORDER BY created_at DESC");
    const ngosWithStats = await Promise.all(ngos.map(async (ngo) => {
      const [reservations] = await all('SELECT COUNT(*) as count FROM reservations WHERE user_id = ?', [ngo.id]);
      const [pending] = await all("SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = 'pending'", [ngo.id]);
      const [collected] = await all("SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = 'collected'", [ngo.id]);
      return { ...ngo, totalReservations: reservations.count, pendingReservations: pending.count, collectedReservations: collected.count };
    }));
    res.json(ngosWithStats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
});

router.get('/orders', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const orders = await all(`SELECT r.*, fl.title as food_title, fl.category as food_category, fl.quantity as food_quantity, fl.unit as food_unit, fl.pickup_address, fl.expiry_date, fl.status as listing_status, u.name as reserver_name, u.email as reserver_email, u.phone as reserver_phone, u.organization as reserver_org, d.name as donor_name, d.email as donor_email FROM reservations r JOIN food_listings fl ON r.food_listing_id = fl.id JOIN users u ON r.user_id = u.id JOIN users d ON fl.user_id = d.id ORDER BY r.created_at DESC`);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/listings', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const listings = await all(`SELECT fl.*, u.name as donor_name, u.email as donor_email, u.phone as donor_phone, u.organization as donor_org FROM food_listings fl JOIN users u ON fl.user_id = u.id ORDER BY fl.created_at DESC`);
    res.json(listings.map(l => ({ ...l, image_urls: l.image_urls || [] })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.patch('/orders/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (!reservation) return res.status(404).json({ error: 'Order not found' });
    await run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    if (status === 'collected') await run("UPDATE food_listings SET status = 'collected' WHERE id = ?", [reservation.food_listing_id]);
    else if (status === 'cancelled') await run("UPDATE food_listings SET status = 'available' WHERE id = ?", [reservation.food_listing_id]);
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;