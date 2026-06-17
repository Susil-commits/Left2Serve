import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const tabs = ['Overview', 'Users', 'NGOs', 'Orders', 'Listings'];

const statusConfig = {
  available: { cls: 'badge-green', dot: 'bg-emerald-400' },
  reserved: { cls: 'badge-yellow', dot: 'bg-amber-400' },
  collected: { cls: 'badge-gray', dot: 'bg-gray-400' },
  cancelled: { cls: 'badge-red', dot: 'bg-red-400' },
  expired: { cls: 'badge-red', dot: 'bg-red-400' },
  pending: { cls: 'badge-yellow', dot: 'bg-amber-400' },
  approved: { cls: 'badge-green', dot: 'bg-emerald-400' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, n, o, l] = await Promise.all([
        api.admin.stats(), api.admin.users(), api.admin.ngos(),
        api.admin.orders(), api.admin.listings()
      ]);
      setStats(s); setUsers(u); setNgos(n); setOrders(o); setListings(l);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleOrderAction = async (id, status) => {
    setActionLoading(id);
    try {
      await api.admin.updateOrder(id, { status });
      await loadData();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active NGOs', value: stats.totalNgos, icon: '🏛️', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Donors', value: stats.totalDonors, icon: '🏪', color: 'from-violet-500 to-violet-600' },
    { label: 'Volunteers', value: stats.totalVolunteers, icon: '🙋', color: 'from-amber-500 to-amber-600' },
    { label: 'Total Listings', value: stats.totalListings, icon: '📋', color: 'from-rose-500 to-rose-600' },
    { label: 'Active Listings', value: stats.activeListings, icon: '🟢', color: 'from-teal-500 to-teal-600' },
    { label: 'Total Orders', value: stats.totalReservations, icon: '📦', color: 'from-orange-500 to-orange-600' },
    { label: 'Pending Orders', value: stats.pendingReservations, icon: '⏳', color: 'from-red-500 to-red-600' },
  ] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 page-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-red">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text">Admin Panel</h1>
            <p className="text-subtle text-sm">Manage users, NGOs, orders and listings</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-fade-in-up">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeTab === t ? 'bg-accent text-white shadow-red' : 'bg-white text-subtle hover:bg-accent/5 hover:text-accent border border-border'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {statCards.map((s, i) => (
                    <div key={i} className="premium-card p-5 animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{s.icon}</span>
                        <span className="text-xs font-semibold text-subtle bg-gray-100 px-2 py-1 rounded-lg">{s.label}</span>
                      </div>
                      <div className="text-3xl font-black text-text tracking-tight highlight-number">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="premium-card p-6">
                    <h3 className="font-bold text-text mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Recent Orders</h3>
                    <div className="space-y-3">
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-text truncate">{o.food_title}</div>
                            <div className="text-xs text-subtle">{o.reserver_name} · {o.quantity} servings</div>
                          </div>
                          <span className={`badge ${statusConfig[o.status]?.cls || 'badge-gray'} ml-3 flex-shrink-0 text-[10px]`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[o.status]?.dot || 'bg-gray-400'}`} />{o.status}
                          </span>
                        </div>
                      ))}
                      {orders.length === 0 && <p className="text-subtle text-sm text-center py-4">No orders yet</p>}
                    </div>
                  </div>
                  <div className="premium-card p-6">
                    <h3 className="font-bold text-text mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-500" />Recent Users</h3>
                    <div className="space-y-3">
                      {users.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">{u.name[0]}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-text truncate">{u.name}</div>
                              <div className="text-xs text-subtle">{u.email}</div>
                            </div>
                          </div>
                          <span className="badge badge-outline capitalize text-[10px] ml-3 flex-shrink-0">{u.role}</span>
                        </div>
                      ))}
                      {users.length === 0 && <p className="text-subtle text-sm text-center py-4">No users yet</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Users' && (
              <div className="premium-card overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-border">
                  <h3 className="font-bold text-text">All Users ({users.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Email</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Role</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Organization</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Phone</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">{u.name[0]}</div>
                              <span className="text-sm font-semibold text-text">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.email}</td>
                          <td className="py-3 px-6"><span className="badge badge-outline capitalize text-[10px]">{u.role}</span></td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.organization || '—'}</td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.phone || '—'}</td>
                          <td className="py-3 px-6 text-sm text-subtle">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-subtle text-sm text-center py-12">No users found</p>}
                </div>
              </div>
            )}

            {activeTab === 'NGOs' && (
              <div className="animate-fade-in space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total NGOs', value: ngos.length },
                    { label: 'Total Reservations', value: ngos.reduce((a, n) => a + n.totalReservations, 0) },
                    { label: 'Pending', value: ngos.reduce((a, n) => a + n.pendingReservations, 0) },
                    { label: 'Collected', value: ngos.reduce((a, n) => a + n.collectedReservations, 0) },
                  ].map((s, i) => (
                    <div key={i} className="premium-card p-4 animate-scale-in" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="text-2xl font-black text-text">{s.value}</div>
                      <div className="text-subtle text-xs mt-1 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="premium-card overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-bold text-text">Active NGOs ({ngos.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Name</th>
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Organization</th>
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Contact</th>
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Total Orders</th>
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Pending</th>
                          <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ngos.map(n => (
                          <tr key={n.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">{n.name[0]}</div>
                                <span className="text-sm font-semibold text-text">{n.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-sm text-subtle">{n.organization || '—'}</td>
                            <td className="py-3 px-6 text-sm text-subtle">{n.email}<br /><span className="text-xs">{n.phone || '—'}</span></td>
                            <td className="py-3 px-6"><span className="text-sm font-bold text-text">{n.totalReservations}</span></td>
                            <td className="py-3 px-6"><span className="badge badge-yellow text-[10px]">{n.pendingReservations}</span></td>
                            <td className="py-3 px-6"><span className="badge badge-green text-[10px]">{n.collectedReservations}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ngos.length === 0 && <p className="text-subtle text-sm text-center py-12">No NGOs registered</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Orders' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total Orders', value: orders.length },
                    { label: 'Pending', value: orders.filter(o => o.status === 'pending').length },
                    { label: 'Approved', value: orders.filter(o => o.status === 'approved').length },
                    { label: 'Collected', value: orders.filter(o => o.status === 'collected').length },
                  ].map((s, i) => (
                    <div key={i} className="premium-card p-4 animate-scale-in" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="text-2xl font-black text-text">{s.value}</div>
                      <div className="text-subtle text-xs mt-1 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="premium-card overflow-hidden">
                  <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-text">All Orders ({orders.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Order ID</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Food</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">NGO/Receiver</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Donor</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Qty</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                            <td className="py-3 px-4 text-sm font-mono text-subtle">#{o.id}</td>
                            <td className="py-3 px-4">
                              <div className="text-sm font-semibold text-text max-w-[180px] truncate">{o.food_title}</div>
                              <div className="text-xs text-subtle">{o.food_category}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-text font-medium">{o.reserver_name}</div>
                              <div className="text-xs text-subtle">{o.reserver_org || o.reserver_email}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-subtle">{o.donor_name}</td>
                            <td className="py-3 px-4 text-sm text-text font-semibold">{o.quantity}</td>
                            <td className="py-3 px-4">
                              <span className={`badge ${statusConfig[o.status]?.cls || 'badge-gray'} text-[10px]`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[o.status]?.dot || 'bg-gray-400'}`} />{o.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1.5">
                                {o.status === 'pending' && (
                                  <button onClick={() => handleOrderAction(o.id, 'approved')} disabled={actionLoading === o.id}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                                    {actionLoading === o.id ? '...' : 'Approve'}
                                  </button>
                                )}
                                {(o.status === 'pending' || o.status === 'approved') && (
                                  <>
                                    <button onClick={() => handleOrderAction(o.id, 'collected')} disabled={actionLoading === o.id}
                                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50">
                                      {actionLoading === o.id ? '...' : 'Collect'}
                                    </button>
                                    <button onClick={() => handleOrderAction(o.id, 'cancelled')} disabled={actionLoading === o.id}
                                      className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                                      {actionLoading === o.id ? '...' : 'Cancel'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {orders.length === 0 && <p className="text-subtle text-sm text-center py-12">No orders found</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Listings' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total Listings', value: listings.length },
                    { label: 'Available', value: listings.filter(l => l.status === 'available').length },
                    { label: 'Reserved', value: listings.filter(l => l.status === 'reserved').length },
                    { label: 'Collected', value: listings.filter(l => l.status === 'collected').length },
                  ].map((s, i) => (
                    <div key={i} className="premium-card p-4 animate-scale-in" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="text-2xl font-black text-text">{s.value}</div>
                      <div className="text-subtle text-xs mt-1 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="premium-card overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-bold text-text">All Listings ({listings.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Title</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Donor</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Category</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Qty</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map(l => (
                          <tr key={l.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                            <td className="py-3 px-4 text-sm font-semibold text-text max-w-[200px] truncate">{l.title}</td>
                            <td className="py-3 px-4 text-sm text-subtle">{l.donor_name}</td>
                            <td className="py-3 px-4 text-sm text-subtle capitalize">{l.category}</td>
                            <td className="py-3 px-4 text-sm text-text font-semibold">{l.quantity} {l.unit}</td>
                            <td className="py-3 px-4">
                              <span className={`badge ${statusConfig[l.status]?.cls || 'badge-gray'} text-[10px]`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[l.status]?.dot || 'bg-gray-400'}`} />{l.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-subtle">{new Date(l.expiry_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {listings.length === 0 && <p className="text-subtle text-sm text-center py-12">No listings found</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}