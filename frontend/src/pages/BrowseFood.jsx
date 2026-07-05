import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FoodCard from '../components/FoodCard';
import Pagination from '../components/Pagination';

const categories = [
  { value: '', label: 'All', icon: '🌟' },
  { value: 'event', label: 'Events', icon: '🎉' },
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'hotel', label: 'Hotels', icon: '🏨' },
  { value: 'caterer', label: 'Caterers', icon: '🍱' },
  { value: 'household', label: 'Households', icon: '🏠' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'quantity', label: 'Most Quantity' },
];

const LIMIT = 12;

export default function BrowseFood() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listings.getAll({
        category: category || undefined,
        search: debouncedSearch || undefined,
        sort,
        page,
        limit: LIMIT,
      });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load listings');
      setListings([]);
    }
    setLoading(false);
  }, [category, debouncedSearch, sort, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const changeCategory = (value) => { setCategory(value); setPage(1); };
  const changeSort = (value) => { setSort(value); setPage(1); };
  const clearSearch = () => { setSearch(''); setPage(1); };
  const changePage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category) next.set('category', category); else next.delete('category');
    setSearchParams(next, { replace: true });
  }, [category, searchParams, setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">Browse <span className="gradient-text-static">Food</span></h1>
        <p className="text-subtle">Find surplus food available for reservation near you</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in-up">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or description..." className="input-field pl-14" />
          {search && (
            <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <select value={sort} onChange={e => changeSort(e.target.value)} className="input-field select-field !w-auto !py-2 !px-4 !text-sm">
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap mb-8 animate-fade-in-up">
        {categories.map(c => (
          <button key={c.value} onClick={() => changeCategory(c.value)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 ${
              category === c.value ? 'bg-accent text-white shadow-red scale-105' : 'bg-gray-50 text-subtle hover:bg-gray-100 hover:text-text border border-border hover:border-accent/20'
            }`}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="premium-card p-16 text-center animate-scale-in">
          <div className="text-6xl mb-6 opacity-20">⚠️</div>
          <p className="text-subtle text-lg mb-2 font-medium">Couldn't load listings</p>
          <p className="text-muted text-sm mb-6">{error}</p>
          <button onClick={loadData} className="btn-outline !py-2 !px-4 !text-sm !rounded-xl">Try Again</button>
        </div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="skeleton h-52" />
              <div className="premium-card rounded-t-none p-4 space-y-3">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="premium-card p-16 text-center animate-scale-in">
          <div className="text-6xl mb-6 opacity-20">🍽️</div>
          <p className="text-subtle text-lg mb-2 font-medium">No food listings found</p>
          <p className="text-muted text-sm mb-6">{search ? 'Try a different search term' : 'Try a different category or check back later'}</p>
          {search && <button onClick={clearSearch} className="btn-outline !py-2 !px-4 !text-sm !rounded-xl">Clear Search</button>}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-4 font-medium">{pagination.total} listing{pagination.total !== 1 ? 's' : ''} found{pagination.totalPages > 1 && ` · Page ${pagination.page} of ${pagination.totalPages}`}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(l => <FoodCard key={l.id} listing={l} />)}
          </div>
          <Pagination page={pagination.page} pageCount={pagination.totalPages} onChange={changePage} />
        </>
      )}
    </div>
  );
}
