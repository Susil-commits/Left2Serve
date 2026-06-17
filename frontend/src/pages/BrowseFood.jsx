import { useEffect, useState } from 'react';
import { api } from '../api';
import FoodCard from '../components/FoodCard';

const categories = [
  { value: '', label: 'All' }, { value: 'event', label: 'Events' }, { value: 'restaurant', label: 'Restaurants' },
  { value: 'hotel', label: 'Hotels' }, { value: 'caterer', label: 'Caterers' }, { value: 'household', label: 'Households' },
];

export default function BrowseFood() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { (async () => { setLoading(true); try { setListings(await api.listings.getAll({ category: category || undefined, search: search || undefined })); } catch (err) { console.error(err); } finally { setLoading(false); } })(); }, [category, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <div className="mb-8 animate-fade-in"><h1 className="text-4xl font-black tracking-tight text-text mb-2">Browse <span className="gradient-text-static">Food</span></h1><p className="text-subtle">Find surplus food available for reservation</p></div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in-up">
        <div className="relative flex-1"><svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..." className="input-field pl-14" /></div>
        <div className="flex gap-2 flex-wrap">{categories.map(c => <button key={c.value} onClick={() => setCategory(c.value)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${category === c.value ? 'bg-accent text-white shadow-red' : 'bg-gray-50 text-subtle hover:bg-gray-100 hover:text-text hover:shadow-sm'}`}>{c.label}</button>)}</div>
      </div>
      {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="rounded-2xl overflow-hidden"><div className="skeleton h-52" /><div className="premium-card rounded-t-none p-4 space-y-3"><div className="skeleton h-3 w-20" /><div className="skeleton h-4 w-full" /><div className="skeleton h-3 w-3/4" /></div></div>)}</div> : listings.length === 0 ? <div className="premium-card p-16 text-center"><div className="text-6xl mb-6 opacity-20">🍽️</div><p className="text-subtle text-lg mb-2 font-medium">No food listings found</p><p className="text-muted text-sm">Try a different category or check back later</p></div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{listings.map(l => <FoodCard key={l.id} listing={l} />)}</div>}
    </div>
  );
}