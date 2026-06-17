import { Link } from 'react-router-dom';

const categoryIcons = { event: '🎉', restaurant: '🍽️', hotel: '🏨', caterer: '🍱', household: '🏠' };
const categoryLabels = { event: 'Event', restaurant: 'Restaurant', hotel: 'Hotel', caterer: 'Caterer', household: 'Household' };

export default function FoodCard({ listing }) {
  const imageUrl = listing.image_urls?.[0] || null;
  const expiryDate = new Date(listing.expiry_date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isExpiringSoon = expiryDate < tomorrow;

  return (
    <Link to={`/food/${listing.id}`} className="block animate-scale-in group">
      <div className="premium-card overflow-hidden card-hover-lift">
        <div className="h-52 bg-gray-50 relative overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className="flex items-center justify-center h-full text-5xl opacity-20 group-hover:opacity-30 transition-opacity">{categoryIcons[listing.category] || '🍽️'}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {listing.price > 0 ? <span className="badge badge-outline !bg-white/90 backdrop-blur-sm">${listing.price}</span> : <span className="badge badge-green !bg-white/90 backdrop-blur-sm">Free</span>}
          </div>
          {isExpiringSoon && listing.status === 'available' && <span className="absolute top-3 right-3 badge badge-red !bg-white/90 backdrop-blur-sm animate-pulse">Expires soon</span>}
          <div className="absolute bottom-3 left-3"><span className="badge badge-outline !bg-white/90 backdrop-blur-sm text-[10px]">{categoryIcons[listing.category]} {categoryLabels[listing.category]}</span></div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-text text-sm truncate mb-1 group-hover:text-accent transition-colors">{listing.title}</h3>
          <p className="text-subtle text-xs line-clamp-2 mb-3 leading-relaxed">{listing.description || 'No description provided'}</p>
          <div className="flex justify-between items-center text-xs text-muted"><span className="font-medium text-subtle">{listing.quantity} {listing.unit}</span><span className="truncate ml-2">{listing.donor_name || listing.donor_org}</span></div>
        </div>
      </div>
    </Link>
  );
}