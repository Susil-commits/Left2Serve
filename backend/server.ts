import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { get, insert } from './db/database.js';
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
import chatRoutes from './routes/chat.js';
import watchlistsRoutes from './routes/watchlists.js';
import forumRoutes from './routes/forum.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
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
function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return cb(null, true); // same-origin / curl / postman
  if (allowedOrigins.has(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
  cb(new Error(`CORS blocked: ${origin}`));
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  contentSecurityPolicy: { 
    directives: { 
      defaultSrc: ["'self'"], 
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], 
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "wss://*"], 
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], 
      fontSrc: ["'self'", "https://fonts.gstatic.com"], 
      frameAncestors: ["'none'"], 
      baseUri: ["'self'"] 
    } 
  },
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
app.use('/api/chat', chatRoutes);
app.use('/api/watchlists', watchlistsRoutes);
app.use('/api/forum', forumRoutes);
app.get('/api/health', (req: Request, res: Response) => res.json({ status: 'ok' }));

app.use((req: Request, res: Response) => { res.status(404).json({ error: 'Not found' }) });
// eslint-disable-next-line no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') return res.status(400).json({ error: 'Invalid or too large request body' });
  if (err?.message?.startsWith('CORS blocked')) return res.status(403).json({ error: 'Not allowed by CORS' });
  
  if (!isProduction) {
    console.error('Unhandled error:', err);
  } else {
    console.error('Unhandled error:', err.message);
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

export const io = new SocketIOServer(server, {
  cors: {
    origin: Array.from(allowedOrigins),
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  if (socket.data?.user?.id) {
    socket.join(`user_${socket.data.user.id}`);
  }

  socket.on('join_reservation', async (reservationId) => {
    const rId = Number(reservationId);
    if (!Number.isInteger(rId) || rId <= 0) {
      socket.emit('error', 'Invalid reservation ID');
      return;
    }
    const reservation = await get('SELECT * FROM reservations WHERE id = ?', [rId]);
    if (!reservation) return;
    const listing = await get('SELECT user_id FROM food_listings WHERE id = ?', [reservation.food_listing_id]);
    const isReserver = socket.data.user.id === reservation.user_id;
    const isDonor = listing && socket.data.user.id === listing.user_id;
    const isAdmin = socket.data.user.role === 'admin';
    if (isReserver || isDonor || isAdmin) {
      socket.join(`reservation_${rId}`);
    }
  });

  socket.on('send_message', async (data) => {
    const { reservationId, content } = data;
    if (!content || !reservationId) return;
    const rId = Number(reservationId);
    if (!Number.isInteger(rId) || rId <= 0) {
      socket.emit('error', 'Invalid reservation ID');
      return;
    }
    if (!socket.rooms.has(`reservation_${rId}`)) {
      socket.emit('error', 'You must join the reservation chat first');
      return;
    }

    try {
      const id = await insert('INSERT INTO messages (reservation_id, sender_id, content) VALUES (?, ?, ?)', [rId, socket.data.user.id, content]);
      const user = await get('SELECT name FROM users WHERE id = ?', [socket.data.user.id]);
      
      io.to(`reservation_${rId}`).emit('new_message', {
        id,
        reservation_id: rId,
        sender_id: socket.data.user.id,
        sender_name: user?.name,
        content,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });
});

const PORT = process.env.PORT || 5000;
initializeDb().then(async () => {
  await sweepExpiredListings();
  setInterval(sweepExpiredListings, 5 * 60 * 1000);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.error('FATAL: Failed to start server:\n' + (err.message || err));
  process.exit(1);
});
