import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, insert } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, address, organization } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Name, email, password, and role are required' });
  if (!['donor', 'ngo', 'volunteer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = bcrypt.hashSync(password, 10);
    const id = await insert('INSERT INTO users (name, email, password_hash, role, phone, address, organization) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, email, password_hash, role, phone || null, address || null, organization || null]);
    const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email, role } });
  } catch (err) { res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await get('SELECT id, name, email, role, phone, address, organization, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;