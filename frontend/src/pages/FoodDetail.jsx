import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Lightbox from '../components/Lightbox';
import StarRating from '../components/StarRating';
import { openRazorpayCheckout } from '../utils/razorpay';
import { Helmet } from 'react-helmet-async';

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
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [donorRating, setDonorRating] = useState(null);
  const [closing, setClosing] = useState(false);

  const loadListing = useCallback(async () => {
    try {
      const data = await api.listings.getOne(id);
      setListing(data);
      try { setDonorRating(await api.reviews.forUser(data.user_id)); } catch { setDonorRating(null); }
    } catch { setError('Listing not found'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    loadListing();
  }, [loadListing]);

  const handleReserve = async (e) => {
    e.preventDefault();
    setReserving(true);
    setError('');
    try {
      const price = Number(listing.price) || 0;
      const isPaid = price > 0;
      if (isPaid && paymentMethod === 'razorpay') {
        const order = await api.payments.createOrder({ food_listing_id: listing.id, quantity: parseInt(quantity), pickup_time: pickupTime || null, notes: notes || null });
        const paid = await openRazorpayCheckout(order, user);
        if (!paid) {
          try { await api.reservations.update(order.reservation_id, { status: 'cancelled' }); } catch { /* best-effort release */ }
          addToast('Payment cancelled. Your reservation was released.', 'error');
          await loadListing();
          return;
        }
        const result = await api.payments.verify({ reservation_id: order.reservation_id, razorpay_order_id: order.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature });
        setMessage(result.success ? 'Payment successful! Reservation confirmed.' : 'Reservation confirmed!');
        addToast('Payment successful & food reserved', 'success');
      } else {
        await api.reservations.create({ food_listing_id: listing.id, quantity: parseInt(quantity), pickup_time: pickupTime || null, notes: notes || null, payment_method: isPaid ? paymentMethod : undefined });
        setMessage('Reservation confirmed!');
        addToast('Food reserved successfully', 'success');
      }
      await loadListing();
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    }
    setReserving(false);
  };

  const handleClose = async () => {
    const ok = await confirm({ title: 'Mark as donated?', message: 'This records the listing as donated/collected without a reservation. This cannot be undone.', confirmLabel: 'Mark Donated', variant: 'danger' });
    if (!ok) return;
    setClosing(true);
    try {
      await api.listings.close(id);
      addToast('Listing marked as donated', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setClosing(false);
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
  const remaining = listing.remaining != null ? Number(listing.remaining) : Number(listing.quantity);
  const canReserve = user && (user.role === 'ngo' || user.role === 'volunteer') && listing.status === 'available' && remaining > 0;
  const status = statusConfig[listing.status] || statusConfig.available;
  const isExpired = new Date(listing.expiry_date) < new Date();
  const price = Number(listing.price) || 0;
  const isPaid = price > 0;
  const total = Math.round(price * (parseInt(quantity) || 1) * 100) / 100;
  const pageUrl = window.location.href;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <Helmet>
        <title>{listing.title} | Left2Serve</title>
        <meta name="description" content={listing.description || `Available ${categoryLabels[listing.category]} food. Donated to prevent waste.`} />
        <meta property="og:title" content={listing.title} />
        <meta property="og:description" content={listing.description || `Claim this food on Left2Serve and help prevent food waste!`} />
        {listing.image_urls?.[0] && <meta property="og:image" content={listing.image_urls[0]} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

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
              { label: 'Quantity', value: `${listing.quantity} ${listing.unit}`, sub: listing.status === 'available' && remaining < listing.quantity ? `${remaining} available` : null, icon: '📦' },
              { label: 'Price', value: listing.price > 0 ? `$${listing.price}` : 'Free', icon: '💰', highlight: listing.price === 0 },
              { label: 'Expires', value: new Date(listing.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), icon: '⏰' },
              { label: 'Donor', value: listing.donor_org || listing.donor_name, icon: '👤', rating: donorRating },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-muted text-xs mb-1 font-medium flex items-center gap-1"><span className="text-sm">{item.icon}</span> {item.label}</div>
                <div className={`font-semibold text-sm ${item.highlight ? 'text-emerald-600' : 'text-text'}`}>{item.value}</div>
                {item.sub && <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{item.sub}</div>}
                {item.rating && item.rating.count > 0 && <div className="mt-1"><StarRating value={item.rating.average} size="sm" showValue count={item.rating.count} /></div>}
              </div>
            ))}
          </div>

          {listing.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-subtle mb-2 uppercase tracking-wider">Description</h3>
              <p className="text-subtle text-sm leading-relaxed bg-gray-50 rounded-2xl p-4 border border-border">{listing.description}</p>
            </div>
          )}

          {listing.dietary_preferences && listing.dietary_preferences.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-subtle mb-2 uppercase tracking-wider">Dietary Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {listing.dietary_preferences.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">{tag}</span>
                ))}
              </div>
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
            <div className="mb-6 flex gap-3 flex-wrap">
              <Link to={`/edit-food/${listing.id}`} className="flex-1 px-4 py-3 bg-gray-50 border border-border text-text rounded-2xl text-sm font-semibold hover:bg-gray-100 transition-colors text-center">Edit Listing</Link>
              {listing.status === 'available' && (
                <button onClick={handleClose} disabled={closing} className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50">
                  {closing ? 'Marking...' : 'Mark Donated'}
                </button>
              )}
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
                    <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
                      min={1} max={remaining} required className="input-field" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">/ {remaining}</span>
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
              {isPaid && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentMethod('cod')}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cod' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">💵</span>
                        <span className="text-sm font-bold text-text">Cash on Delivery</span>
                      </div>
                      <p className="text-xs text-muted">Pay in cash at pickup</p>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('razorpay')}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'razorpay' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">💳</span>
                        <span className="text-sm font-bold text-text">Pay Online</span>
                      </div>
                      <p className="text-xs text-muted">UPI / Cards / Netbanking</p>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border">
                    <span className="text-sm font-semibold text-subtle">Total payable</span>
                    <span className="text-lg font-black text-text">₹{total.toFixed(2)}{paymentMethod === 'cod' && <span className="text-xs font-medium text-muted ml-1">at pickup</span>}</span>
                  </div>
                </div>
              )}
              <button type="submit" disabled={reserving} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">
                {reserving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</span> : (isPaid && paymentMethod === 'razorpay' ? `Pay ₹${total.toFixed(2)} & Reserve` : 'Confirm Reservation')}
              </button>
            </form>
          )}

          {!user && listing.status === 'available' && remaining > 0 && (
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