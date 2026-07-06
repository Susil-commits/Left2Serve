import jwt from 'jsonwebtoken';
import { get } from '../db/database.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('FATAL: JWT_SECRET must be set to a long random string (>= 16 chars) in your environment.');
  process.exit(1);
}

const SECRET = process.env.JWT_SECRET;

async function verifyToken(token) {
  const decoded = jwt.verify(token, SECRET);
  if (!decoded || typeof decoded.id !== 'number') throw new Error('bad token');
  if (decoded.role === 'admin') {
    if (decoded.id !== 0) throw new Error('bad admin token');
    return decoded;
  }
  const user = await get('SELECT token_version, is_active FROM users WHERE id = ?', [decoded.id]);
  if (!user) throw new Error('user gone');
  if (!user.is_active) throw new Error('suspended');
  if (Number(decoded.tv || 0) !== Number(user.token_version || 0)) throw new Error('token revoked');
  return decoded;
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = await verifyToken(header.split(' ')[1]);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = await verifyToken(header.split(' ')[1]); }
    catch { req.user = null; }
  }
  next();
}

export function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
