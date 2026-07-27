import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { useToast } from './Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PushNotificationManager() {
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    };
    requestPermission();

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(API_BASE_URL, { auth: { token } });

    socket.on('new_listing', (listing) => {
      const msg = `New food listing: ${listing.title}`;
      addToast(msg, 'info');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Left2Serve: Match Found!', {
          body: msg,
          icon: '/favicon.ico'
        });
      }
    });

    socket.on('reservation_update', (reservation) => {
      const msg = `Reservation for ${reservation.food_title} is now ${reservation.status}`;
      addToast(msg, 'success');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Left2Serve: Update', {
          body: msg,
          icon: '/favicon.ico'
        });
      }
    });

    return () => socket.disconnect();
  }, [user, addToast]);

  return null;
}
