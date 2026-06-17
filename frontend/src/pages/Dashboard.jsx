import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { api } from '../api';

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
  const [myListings, setMyListings] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (user.role === 'donor') setMyListings(await api.listings.getMine());
      if (user.role === 'ngo' || user.role === 'volunteer') setMyReservations(await api.reservations.getMine());
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [user.role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleReservationAction = async (id, action) => {
    setActionLoading(id);
    try {
      await api.reservations.update(id, { status: action });
      await loadData();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const donorStats = [
    { label: 'Total Listings', value: myListings.length, icon: '📋', color: 'from-blue-500/10 to-blue-500/5' },
    { label: 'Available', value: myListings.filter(l => l.status === 'available').length, icon: '🟢', color: 'from-emerald-500/10 to-emerald-500/5' },
    { label: 'Reserved', value: myListings.filter(l => l.status === 'reserved').length, icon: '📌', color: 'from-amber-500/10 to-amber-500/5' },
    { label: 'Collected', value: myListings.filter(l => l.status === 'collected').length, icon: '📦', color: 'from-violet-500/10 to-violet-500/5' },
  ];

  const receiverStats = [
    { label: 'Total Orders', value: myReservations.length, icon: '📦', color: 'from-blue-500/10 to-blue-500/5' },
    { label: 'Pending', value: myReservations.filter(r => r.status === 'pending').length, icon: '⏳', color: 'from-amber-500/10 to-amber-500/5' },
    { label: 'Approved', value: myReservations.filter(r => r.status === 'approved').length, icon: '✅', color: 'from-emerald-500/10 to-emerald-500/5' },
    { label: 'Collected', value: myReservations.filter(r => r.status === 'collected').length, icon: '🎉', color: 'from-violet-500/10 to-violet-500/5' },
  ];

  const stats = user.role === 'donor' ? donorStats : receiverStats;

  const getOrderStepIndex = (status) => {
    const map = { pending: 0, approved: 1, collected: 2 };
    return map[status] ?? -1;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center text-accent text-sm font-bold shadow-sm">{user.name[0]}</div>
          <div>
            <p className="text-text font-semibold">{user.name}</p>
            <p className="text-subtle text-sm capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="premium-card p-5 animate-scale-in relative overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br rounded-bl-3xl opacity-20 -mr-2 -mt-2" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2"><span className="text-lg">{s.icon}</span></div>
              <div className="text-3xl font-black text-text tracking-tight highlight-number">{loading ? '-' : s.value}</div>
              <div className="text-subtle text-sm mt-1 font-medium">{s.label}</div>
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
              {myListings.map(l => (
                <div key={l.id} className="premium-card p-5 flex justify-between items-center group">
                  <div className="min-w-0 flex-1">
                    <Link to={`/food/${l.id}`} className="font-semibold text-text group-hover:text-accent transition-colors truncate block">{l.title}</Link>
                    <div className="text-subtle text-sm mt-1">{l.quantity} {l.unit} · {l.category}</div>
                    <div className="text-xs text-muted mt-1">Expires: {new Date(l.expiry_date).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${statusConfig[l.status]?.cls || 'badge-gray'} ml-4 flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[l.status]?.dot || 'bg-gray-400'}`} />{statusConfig[l.status]?.label || l.status}
                  </span>
                </div>
              ))}
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
          ) : myReservations.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <div className="text-5xl mb-4 opacity-20">📦</div>
              <p className="text-subtle mb-4 font-medium">No orders yet</p>
              <Link to="/browse" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Browse available food</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <h3 className="font-semibold text-text text-sm truncate group-hover:text-accent transition-colors mb-2">{r.food_title}</h3>
                    <div className="text-subtle text-xs mb-3">{r.quantity} servings · {r.pickup_address?.substring(0, 25)}...</div>
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