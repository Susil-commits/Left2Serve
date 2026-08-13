import { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { useToast } from './Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PushNotificationManager() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    if (tokenRef.current === token) return;
    tokenRef.current = token;

    const socket = io(API_BASE_URL, {
      auth: { token },
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
      tokenRef.current = null;
    };
  }, [user, addToast]);

  return null;
}

