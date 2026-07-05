import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const statusConfig = {
  available: { cls: 'badge-green', dot: 'bg-emerald-500', label: 'Available' },
  reserved: { cls: 'badge-yellow', dot: 'bg-amber-500', label: 'Reserved' },
  collected: { cls: 'badge-gray', dot: 'bg-gray-400', label: 'Collected' },
  cancelled: { cls: 'badge-red', dot: 'bg-red-500', label: 'Cancelled' },
  expired: { cls: 'badge-red', dot: 'bg-red-500', label: 'Expired' },
  pending: { cls: 'badge-yellow', dot: 'bg-amber-500', label: 'Pending' },
  approved: { cls: 'badge-green', dot: 'bg-emerald-500', label: 'Approved' },
};

const orderSteps = [
  { key: 'pending', label: 'Requested', icon: '📝' },
  { key: 'approved', label: 'Approved', icon: '✅' },
  { key: 'collected', label: 'Collected', icon: '📦' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [myListings, setMyListings] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [listingReservations, setListingReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedListing, setExpandedListing] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (user.role === 'donor') {
        const listings = await api.listings.getMine();
        setMyListings(listings);
        const resMap = {};
        await Promise.all(listings.filter(l => l.status === 'reserved').map(async (l) => {
          try { resMap[l.id] = await api.reservations.getForListing(l.id); } catch { resMap[l.id] = []; }
        }));
        setListingReservations(resMap);
      }
      if (user.role === 'ngo' || user.role === 'volunteer') {
        setMyReservations(await api.reservations.getMine());
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load dashboard data', 'error');
    }
    setLoading(false);
  }, [user.role, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleReservationAction = async (id, action) => {
    if (action === 'cancelled') {
      const ok = await confirm({ title: 'Cancel this reservation?', message: 'The listing will become available again for others to reserve.', confirmLabel: 'Cancel Reservation', variant: 'danger' });
      if (!ok) return;
    }
    setActionLoading(id);
    try {
      await api.reservations.update(id, { status: action });
      addToast(`Reservation ${action}`, 'success');
      await loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setActionLoading(null);
  };

  const donorStats = [
    { label: 'Total Listings', value: myListings.length, icon: '📋' },
    { label: 'Available', value: myListings.filter(l => l.status === 'available').length, icon: '🟢' },
    { label: 'Reserved', value: myListings.filter(l => l.status === 'reserved').length, icon: '📌' },
    { label: 'Collected', value: myListings.filter(l => l.status === 'collected').length, icon: '📦' },
  ];

  const receiverStats = [
    { label: 'Total Orders', value: myReservations.length, icon: '📦' },
    { label: 'Pending', value: myReservations.filter(r => r.status === 'pending').length, icon: '⏳' },
    { label: 'Approved', value: myReservations.filter(r => r.status === 'approved').length, icon: '✅' },
    { label: 'Collected', value: myReservations.filter(r => r.status === 'collected').length, icon: '🎉' },
  ];

  const stats = user.role === 'donor' ? donorStats : receiverStats;

  const getOrderStepIndex = (status) => {
    const map = { pending: 0, approved: 1, collected: 2 };
    return map[status] ?? -1;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text mb-2">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center text-accent text-sm font-bold shadow-sm">{user.name[0]}</div>
          <div>
            <p className="text-text font-semibold">{user.name}</p>
            <p className="text-subtle text-sm capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="premium-card p-4 sm:p-5 animate-scale-in relative overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2"><span className="text-lg">{s.icon}</span></div>
              <div className="text-2xl sm:text-3xl font-black text-text tracking-tight highlight-number">{loading ? '-' : s.value}</div>
              <div className="text-subtle text-xs sm:text-sm mt-1 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {user.role === 'donor' && (
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text">My Listings</h2>
            <Link to="/list-food" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Listing
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          ) : myListings.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <div className="text-5xl mb-4 opacity-20">📋</div>
              <p className="text-subtle mb-4 font-medium">No listings yet</p>
              <Link to="/list-food" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Create your first listing</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map(l => {
                const reservations = listingReservations[l.id] || [];
                const isExpanded = expandedListing === l.id;
                return (
                  <div key={l.id} className="premium-card overflow-hidden">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group">
                      <div className="min-w-0 flex-1">
                        <Link to={`/food/${l.id}`} className="font-semibold text-text group-hover:text-accent transition-colors truncate block">{l.title}</Link>
                        <div className="text-subtle text-sm mt-1">{l.quantity} {l.unit} · {l.category}</div>
                        <div className="text-xs text-muted mt-1">Expires: {new Date(l.expiry_date).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge ${statusConfig[l.status]?.cls || 'badge-gray'} text-[10px]`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[l.status]?.dot || 'bg-gray-400'}`} />{statusConfig[l.status]?.label || l.status}
                        </span>
                        <Link to={`/edit-food/${l.id}`} className="px-3 py-1.5 bg-gray-100 text-subtle text-xs font-semibold rounded-lg hover:bg-accent/10 hover:text-accent transition-colors">Edit</Link>
                        {l.status === 'reserved' && reservations.length > 0 && (
                          <button onClick={() => setExpandedListing(isExpanded ? null : l.id)}
                            className="px-3 py-1.5 bg-accent/5 text-accent text-xs font-semibold rounded-lg hover:bg-accent/10 transition-colors">
                            {isExpanded ? 'Hide' : `${reservations.length} request${reservations.length > 1 ? 's' : ''}`}
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && reservations.length > 0 && (
                      <div className="border-t border-border bg-gray-50/50 p-4 sm:p-5 animate-slide-up">
                        <h4 className="text-xs font-bold text-subtle uppercase tracking-wider mb-3">Reservation Requests</h4>
                        <div className="space-y-3">
                          {reservations.map(r => (
                            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl p-4 border border-border">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text">{r.reserver_name}</div>
                                <div className="text-xs text-subtle">{r.reserver_org || 'No organization'} · {r.reserver_phone || 'No phone'}</div>
                                <div className="text-xs text-muted mt-1">Qty: {r.quantity} · {new Date(r.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`badge ${statusConfig[r.status]?.cls || 'badge-gray'} text-[10px]`}>
                                  {statusConfig[r.status]?.label || r.status}
                                </span>
                                {r.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleReservationAction(r.id, 'approved')} disabled={actionLoading === r.id}
                                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                                      {actionLoading === r.id ? '...' : 'Approve'}
                                    </button>
                                    <button onClick={() => handleReservationAction(r.id, 'cancelled')} disabled={actionLoading === r.id}
                                      className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                                      {actionLoading === r.id ? '...' : 'Cancel'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(user.role === 'ngo' || user.role === 'volunteer') && (
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text">My Orders</h2>
            <Link to="/browse" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Browse Food</Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
          ) : myReservations.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <div className="text-5xl mb-4 opacity-20">📦</div>
              <p className="text-subtle mb-4 font-medium">No orders yet</p>
              <Link to="/browse" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Browse available food</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myReservations.map(r => {
                const stepIdx = getOrderStepIndex(r.status);
                return (
                  <div key={r.id} className="premium-card p-5 group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-subtle font-medium">{r.donor_name}</span>
                      <span className={`badge ${statusConfig[r.status]?.cls || 'badge-gray'} text-[10px]`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[r.status]?.dot || 'bg-gray-400'}`} />{statusConfig[r.status]?.label || r.status}
                      </span>
                    </div>
                    <Link to={`/food/${r.food_listing_id}`} className="font-semibold text-text text-sm truncate block group-hover:text-accent transition-colors mb-2">{r.food_title}</Link>
                    <div className="text-subtle text-xs mb-3">{r.quantity} servings · {r.pickup_address?.substring(0, 25)}...</div>
                    {(r.status === 'approved' || r.status === 'collected') && r.donor_phone && (
                      <div className="mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <div className="min-w-0">
                          <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Contact donor</div>
                          <div className="text-xs text-text font-semibold truncate">{r.donor_phone}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      {orderSteps.map((step, i) => (
                        <div key={step.key} className="flex items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
                            i <= stepIdx ? 'bg-accent text-white' : 'bg-gray-100 text-muted'
                          }`}>{step.icon}</div>
                          {i < orderSteps.length - 1 && (
                            <div className={`w-6 h-0.5 rounded ${i < stepIdx ? 'bg-accent' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'approved' && (
                        <button onClick={() => handleReservationAction(r.id, 'collected')} disabled={actionLoading === r.id}
                          className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                          {actionLoading === r.id ? '...' : 'Mark Collected'}
                        </button>
                      )}
                      {r.status === 'pending' && (
                        <button onClick={() => handleReservationAction(r.id, 'cancelled')} disabled={actionLoading === r.id}
                          className="flex-1 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                          {actionLoading === r.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}