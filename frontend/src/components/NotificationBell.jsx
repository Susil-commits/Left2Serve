import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../api';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const typeIcon = {
  reservation_new: '🔔',
  reservation_approved: '✅',
  reservation_collected: '📦',
  reservation_cancelled: '❌',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadUnread = useCallback(async () => {
    try { const data = await api.notifications.unreadCount(); setUnread(data.count || 0); } catch { /* ignore */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.notifications.list()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    loadUnread();
    
    const token = localStorage.getItem('token');
    const socket = io(API_BASE_URL, {
      auth: { token },
      withCredentials: true
    });
    
    socket.on('new_notification', (notif) => {
      setUnread(u => u + 1);
      setItems(prev => [notif, ...prev]);
    });
    
    const onFocus = () => loadUnread();
    window.addEventListener('focus', onFocus);
    
    return () => { 
      socket.disconnect();
      window.removeEventListener('focus', onFocus); 
    };
  }, [user, loadUnread]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleClickItem = async (item) => {
    if (!item.is_read) {
      try { await api.notifications.markRead(item.id); setUnread((u) => Math.max(0, u - 1)); } catch { /* ignore */ }
    }
    setOpen(false);
    const listingId = item.data?.listingId;
    if (listingId) navigate(`/food/${listingId}`);
    else navigate('/dashboard');
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    try { await api.notifications.markAllRead(); setUnread(0); setItems((prev) => prev.map((n) => ({ ...n, is_read: true }))); } catch { /* ignore */ }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.notifications.remove(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      setUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  if (!user || user.role === 'admin') return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} aria-expanded={open}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-subtle hover:text-accent hover:bg-accent/5 transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white animate-scale-in">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] glass rounded-2xl shadow-xl border border-border overflow-hidden animate-slide-down z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-text">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl mb-3 opacity-20">🔕</div>
                <p className="text-subtle text-sm font-medium">No notifications yet</p>
                <p className="text-subtle text-xs mt-1">Reservation updates will appear here</p>
              </div>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => handleClickItem(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/[0.03] transition-colors group ${!n.is_read ? 'bg-accent/[0.02]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-accent/5 flex items-center justify-center text-sm flex-shrink-0">{typeIcon[n.type] || '🔔'}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text truncate">{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-subtle line-clamp-2 mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-subtle mt-1 block">{timeAgo(n.created_at)}</span>
                  </div>
                  <span onClick={(e) => handleDelete(e, n.id)} role="button" aria-label="Delete notification"
                    className="self-start opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 transition-all flex-shrink-0 p-1 -m-1 cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
