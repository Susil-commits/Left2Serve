import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Lightbox from '../components/Lightbox';

const categoryLabels = { event: 'Event', restaurant: 'Restaurant', hotel: 'Hotel', caterer: 'Caterer', household: 'Household' };
const categoryIcons = { event: '🎉', restaurant: '🍽️', hotel: '🏨', caterer: '🍱', household: '🏠' };
const statusConfig = {
  available: { cls: 'badge-green', label: 'Available', color: 'text-emerald-600' },
  reserved: { cls: 'badge-yellow', label: 'Reserved', color: 'text-amber-600' },
  collected: { cls: 'badge-gray', label: 'Collected', color: 'text-gray-500' },
  cancelled: { cls: 'badge-red', label: 'Cancelled', color: 'text-red-500' },
  expired: { cls: 'badge-gray', label: 'Expired', color: 'text-gray-500' },
};

export default function FoodDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try { setListing(await api.listings.getOne(id)); }
      catch { setError('Listing not found'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleReserve = async (e) => {
    e.preventDefault();
    setReserving(true);
    setError('');
    try {
      await api.reservations.create({ food_listing_id: listing.id, quantity: parseInt(quantity), pickup_time: pickupTime || null, notes: notes || null });
      setMessage('Reservation confirmed!');
      setListing({ ...listing, status: 'reserved' });
      addToast('Food reserved successfully', 'success');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    }
    setReserving(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this listing?', message: 'This action cannot be undone. The listing and its image will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    try {
      await api.listings.delete(id);
      addToast('Listing deleted', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-accent/10 border-t-accent rounded-full animate-spin" />
        <span className="text-subtle text-sm font-medium">Loading listing...</span>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="text-center py-20 page-transition">
      <div className="text-6xl mb-6 opacity-20">🔍</div>
      <p className="text-subtle text-lg font-medium">{error}</p>
      <Link to="/browse" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl mt-6 inline-flex">Browse Listings</Link>
    </div>
  );

  const isOwner = user && user.id === listing.user_id;
  const canReserve = user && (user.role === 'ngo' || user.role === 'volunteer') && listing.status === 'available';
  const status = statusConfig[listing.status] || statusConfig.available;
  const isExpired = new Date(listing.expiry_date) < new Date();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-subtle hover:text-accent transition-colors mb-6 group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back
      </button>
      <div className="premium-card-elevated overflow-hidden animate-scale-in">
        {listing.image_urls?.length > 0 ? (
          <div>
            <div className="aspect-video bg-gray-50 relative overflow-hidden cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
              <img src={listing.image_urls[activeImage]} alt={listing.title} loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="badge badge-outline !bg-white/90 backdrop-blur-sm">{categoryIcons[listing.category]} {categoryLabels[listing.category]}</span>
                {listing.price > 0 ? <span className="badge badge-outline !bg-white/90 backdrop-blur-sm">${listing.price}</span> : <span className="badge badge-green !bg-white/90 backdrop-blur-sm">Free</span>}
              </div>
              <span className={`absolute top-4 right-4 badge ${status.cls} !bg-white/90 backdrop-blur-sm`}>{status.label}</span>
            </div>
            {listing.image_urls.length > 1 && (
              <div className="flex gap-2 p-3 bg-gray-50 overflow-x-auto">
                {listing.image_urls.map((url, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === i ? 'border-accent shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-3 opacity-30">{categoryIcons[listing.category] || '🍽️'}</div>
              <span className="badge badge-outline">{categoryLabels[listing.category]}</span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-accent font-semibold uppercase tracking-wider">{categoryLabels[listing.category]}</span>
                {isExpired && listing.status !== 'expired' && <span className="badge badge-red text-[10px] animate-pulse">Expired</span>}
              </div>
              <h1 className="text-3xl font-bold text-text">{listing.title}</h1>
            </div>
            <span className={`badge ${status.cls} text-sm`}>{status.label}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 p-6 bg-gray-50 rounded-2xl border border-border">
            {[
              { label: 'Quantity', value: `${listing.quantity} ${listing.unit}`, icon: '📦' },
              { label: 'Price', value: listing.price > 0 ? `$${listing.price}` : 'Free', icon: '💰', highlight: listing.price === 0 },
              { label: 'Expires', value: new Date(listing.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), icon: '⏰' },
              { label: 'Donor', value: listing.donor_org || listing.donor_name, icon: '👤' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-muted text-xs mb-1 font-medium flex items-center gap-1"><span className="text-sm">{item.icon}</span> {item.label}</div>
                <div className={`font-semibold text-sm ${item.highlight ? 'text-emerald-600' : 'text-text'}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {listing.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-subtle mb-2 uppercase tracking-wider">Description</h3>
              <p className="text-subtle text-sm leading-relaxed bg-gray-50 rounded-2xl p-4 border border-border">{listing.description}</p>
            </div>
          )}

          <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-border">
            <h3 className="text-sm font-semibold text-subtle mb-3 uppercase tracking-wider">Pickup Details</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="text-text text-sm font-semibold">{listing.pickup_address}</p>
                {listing.pickup_instructions && <p className="text-subtle text-xs mt-1.5 leading-relaxed">{listing.pickup_instructions}</p>}
              </div>
            </div>
          </div>

          {listing.donor_phone && (user?.role === 'ngo' || user?.role === 'volunteer') && !isOwner && (
            <div className="mb-6 p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <div>
                <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Donor contact</div>
                <div className="text-sm text-text font-bold">{listing.donor_phone}</div>
                <p className="text-xs text-emerald-700/80 mt-0.5">Shared once your reservation is approved</p>
              </div>
            </div>
          )}

          {isOwner && listing.status !== 'collected' && (
            <div className="mb-6 flex gap-3">
              <Link to={`/edit-food/${listing.id}`} className="flex-1 px-4 py-3 bg-gray-50 border border-border text-text rounded-2xl text-sm font-semibold hover:bg-gray-100 transition-colors text-center">Edit Listing</Link>
              <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors">Delete Listing</button>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-4 text-sm flex items-center gap-3 font-medium animate-scale-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {message}
            </div>
          )}
          {error && (
            <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-4 text-sm font-medium">{error}</div>
          )}

          {canReserve && (
            <form onSubmit={handleReserve} className="border-t border-border pt-6">
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Reserve This Food
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Quantity</label>
                  <div className="relative">
                    <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(listing.quantity, parseInt(e.target.value) || 1)))}
                      min={1} max={listing.quantity} required className="input-field" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">/ {listing.quantity}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Pickup Time</label>
                  <input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="input-field" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-text mb-2">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field" placeholder="Any special instructions for pickup..." />
              </div>
              <button type="submit" disabled={reserving} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">
                {reserving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Reserving...</span> : 'Confirm Reservation'}
              </button>
            </form>
          )}

          {!user && listing.status === 'available' && (
            <div className="border-t border-border pt-6 text-center">
              <p className="text-subtle mb-4 font-medium">Sign in to reserve this food</p>
              <button onClick={() => navigate('/login')} className="btn-primary !py-2 !px-6 !text-sm !rounded-xl">Sign In to Reserve</button>
            </div>
          )}
        </div>
      </div>
      {lightboxOpen && listing.image_urls?.length > 0 && (
        <Lightbox images={listing.image_urls} index={activeImage} onClose={() => setLightboxOpen(false)} onNavigate={setActiveImage} />
      )}
    </div>
  );
}