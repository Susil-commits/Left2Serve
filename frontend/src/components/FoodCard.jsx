import { Link } from 'react-router-dom';
import { useFavorites } from './Favorites';

const categoryIcons = { event: '🎉', restaurant: '🍽️', hotel: '🏨', caterer: '🍱', household: '🏠' };
const categoryLabels = { event: 'Event', restaurant: 'Restaurant', hotel: 'Hotel', caterer: 'Caterer', household: 'Household' };

export default function FoodCard({ listing }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(listing.id);
  const imageUrl = listing.image_urls?.[0] || null;
  const expiryDate = new Date(listing.expiry_date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isExpiringSoon = expiryDate < tomorrow;

  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(listing.id);
  };

  return (
    <Link to={`/food/${listing.id}`} className="block animate-scale-in group">
      <div className="premium-card overflow-hidden card-hover-lift">
        <div className="h-52 bg-gray-50 relative overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className="flex items-center justify-center h-full text-5xl opacity-20 group-hover:opacity-30 transition-opacity">{categoryIcons[listing.category] || '🍽️'}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {listing.price > 0 ? <span className="badge badge-outline !bg-white/90 backdrop-blur-sm">${listing.price}</span> : <span className="badge badge-green !bg-white/90 backdrop-blur-sm">Free</span>}
          </div>
          <button onClick={handleFav} aria-label={fav ? 'Remove from saved' : 'Save listing'} aria-pressed={fav}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 hover:scale-110 ${fav ? 'bg-accent text-white shadow-red' : 'bg-white/90 text-muted hover:text-accent'}`}>
            <svg className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </button>
          {isExpiringSoon && listing.status === 'available' && !fav && <span className="absolute top-3 right-3 badge badge-red !bg-white/90 backdrop-blur-sm animate-pulse">Expires soon</span>}
          <div className="absolute bottom-3 left-3"><span className="badge badge-outline !bg-white/90 backdrop-blur-sm text-[10px]">{categoryIcons[listing.category]} {categoryLabels[listing.category]}</span></div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-text text-sm truncate mb-1 group-hover:text-accent transition-colors">{listing.title}</h3>
          
          {listing.dietary_preferences && listing.dietary_preferences.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {listing.dietary_preferences.slice(0, 3).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-wider">{tag}</span>
              ))}
              {listing.dietary_preferences.length > 3 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-subtle rounded text-[9px] font-bold uppercase tracking-wider">+{listing.dietary_preferences.length - 3}</span>
              )}
            </div>
          )}

          <p className="text-subtle text-xs line-clamp-2 mb-3 leading-relaxed">{listing.description || 'No description provided'}</p>
          <div className="flex justify-between items-center text-xs text-muted"><span className="font-medium text-subtle">{listing.quantity} {listing.unit}</span><span className="truncate ml-2">{listing.donor_name || listing.donor_org}</span></div>
        </div>
      </div>
    </Link>
  );
}
