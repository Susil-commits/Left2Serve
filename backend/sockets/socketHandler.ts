import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { get, insert } from '../db/database.js';

export function setupSocketHandlers(io: SocketIOServer) {
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
      // Clamp message length to prevent oversized payloads
      const safeContent = String(content).slice(0, 2000);
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
        const id = await insert('INSERT INTO messages (reservation_id, sender_id, content) VALUES (?, ?, ?)', [rId, socket.data.user.id, safeContent]);
        const user = await get('SELECT name FROM users WHERE id = ?', [socket.data.user.id]);
        
        io.to(`reservation_${rId}`).emit('new_message', {
          id,
          reservation_id: rId,
          sender_id: socket.data.user.id,
          sender_name: user?.name,
          content: safeContent,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to send message:', err);
        socket.emit('error', 'Failed to send message');
      }
    });
  });
}
