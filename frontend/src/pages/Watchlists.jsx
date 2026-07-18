import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import MapWrapper from '../components/MapWrapper';

export default function Watchlists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(10);
  const [position, setPosition] = useState(null);
  const { addToast } = useToast();

  const load = async () => {
    try {
      const data = await api.watchlists.getAll();
      setLists(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!position) return addToast('Please pick a location on the map', 'error');
    try {
      await api.watchlists.create({ keyword, radius_km: radius, latitude: position[0], longitude: position[1] });
      addToast('Watchlist created', 'success');
      setAdding(false);
      setKeyword('');
      setRadius(10);
      setPosition(null);
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const remove = async (id) => {
    try {
      await api.watchlists.delete(id);
      addToast('Watchlist removed', 'success');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-transition">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-text tracking-tight">My Watchlists</h1>
        {!adding && <button onClick={() => setAdding(true)} className="btn-primary !px-4 !py-2 !rounded-xl">Add Watchlist</button>}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="premium-card p-6 mb-8 animate-slide-down">
          <h2 className="text-xl font-bold mb-4">Create New Watchlist</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Keyword (Optional)</label>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Bread, Groceries" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Radius (km)</label>
              <input type="number" min="1" max="1000" value={radius} onChange={e => setRadius(e.target.value)} className="input-field" required />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1">Alert Center Location (Click to drop pin)</label>
            <div className="h-64 rounded-2xl overflow-hidden border border-border shadow-sm">
              <MapWrapper pickerMode={true} position={position} setPosition={setPosition} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-subtle hover:text-text font-medium">Cancel</button>
            <button type="submit" className="btn-primary !px-6 !py-2 !rounded-xl">Save Watchlist</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-24 rounded-2xl"></div>)}</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 text-subtle font-medium">No watchlists yet. Create one to get notified when food is posted in your area!</div>
      ) : (
        <div className="space-y-4">
          {lists.map(w => (
            <div key={w.id} className="premium-card p-5 flex justify-between items-center bg-white shadow-sm border border-border rounded-2xl">
              <div>
                <div className="font-bold text-text mb-1">{w.keyword ? `Keyword: "${w.keyword}"` : 'Any food'}</div>
                <div className="text-sm text-subtle">Within {w.radius_km} km of {Number(w.latitude).toFixed(3)}, {Number(w.longitude).toFixed(3)}</div>
              </div>
              <button onClick={() => remove(w.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
