import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import initializeDb from './db/init.js';
import { sweepExpiredListings } from './db/expire.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import reservationRoutes from './routes/reservations.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import reviewRoutes from './routes/reviews.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Build the allowed-origin list: explicit CLIENT_URL value(s) plus any
// *.vercel.app deployment and localhost dev servers, so the exact domain
// spelling in CLIENT_URL can't break CORS.
const allowedOrigins = new Set([
  ...clientUrl.split(',').map((s) => s.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]);
function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true); // same-origin / curl / postman
  if (allowedOrigins.has(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
  cb(new Error(`CORS blocked: ${origin}`));
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], frameAncestors: ["'none'"], baseUri: ["'self'"] } },
}));
app.use(cors({ origin: corsOrigin, credentials: true, maxAge: 86400 }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan(isProduction ? 'combined' : 'dev'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, please try again later' } });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/login', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') return res.status(400).json({ error: 'Invalid or too large request body' });
  if (isProduction) console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
initializeDb().then(async () => {
  await sweepExpiredListings();
  setInterval(sweepExpiredListings, 5 * 60 * 1000);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.error('FATAL: Failed to start server:\n' + (err.message || err));
  process.exit(1);
});
