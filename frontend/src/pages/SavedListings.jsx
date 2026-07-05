import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../components/Favorites';
import { api } from '../api';
import FoodCard from '../components/FoodCard';

export default function SavedListings() {
  const { ids } = useFavorites();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(ids.length > 0);

  useEffect(() => {
    if (!ids.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setListings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const results = await Promise.allSettled(ids.map((id) => api.listings.getOne(id)));
        if (!cancelled) {
          setListings(results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value));
        }
      } catch {
        if (!cancelled) setListings([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ids]);

  const isEmpty = !loading && listings.length === 0;
  const available = listings.length;
  const total = ids.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">Saved <span className="gradient-text-static">Listings</span></h1>
        <p className="text-subtle">{total} saved listing{total !== 1 ? 's' : ''}{available !== total && available > 0 ? ` · ${available} still available` : ''}</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="skeleton h-52" />
              <div className="premium-card rounded-t-none p-4 space-y-3">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="premium-card p-16 text-center animate-scale-in">
          <div className="text-6xl mb-6 opacity-20">❤️</div>
          <p className="text-subtle text-lg mb-2 font-medium">No saved listings yet</p>
          <p className="text-muted text-sm mb-6">Tap the heart icon on any listing to save it for later</p>
          <Link to="/browse" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Browse Food</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((l) => <FoodCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
