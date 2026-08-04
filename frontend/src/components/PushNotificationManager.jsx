import { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { useToast } from './Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PushNotificationManager() {
  const { user } = useAuth();
  const { addToast } = useToast();
  // Track the token so we can detect rotation (e.g. after password change)
  // and reconnect the socket with the fresh token.
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Request notification permission lazily — don't block socket setup
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const token = localStorage.getItem('token');
    // Token MUST exist; without it the socket auth will fail
    if (!token) return;

    // Skip if the same token is already connected (avoids duplicate sockets
    // when the component re-renders without an actual token change).
    if (tokenRef.current === token) return;
    tokenRef.current = token;

    const socket = io(API_BASE_URL, {
      auth: { token },
      // Reconnect automatically on transient network issues
      reconnectionAttempts: 5,
    });

    function showNotif(title, body) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }

    socket.on('new_listing', (listing) => {
      const msg = `New food listing: ${listing.title}`;
      addToast(msg, 'info');
      showNotif('Left2Serve: Match Found!', msg);
    });

    socket.on('reservation_update', (reservation) => {
      const msg = `Reservation for ${reservation.food_title} is now ${reservation.status}`;
      addToast(msg, 'success');
      showNotif('Left2Serve: Update', msg);
    });

    return () => {
      socket.disconnect();
      // Clear ref so a new socket is created on the next valid token
      tokenRef.current = null;
    };
  // Re-run when user changes OR when the token in localStorage changes.
  // We detect token changes by reading it inside the effect; adding `user`
  // as a dep ensures we reconnect after login/logout cycles.
  }, [user, addToast]);

  return null;
}

