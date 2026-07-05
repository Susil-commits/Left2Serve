import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const tabs = ['Overview', 'Users', 'NGOs', 'Orders', 'Listings', 'Audit'];

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
  const { logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [trends, setTrends] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [userLoading, setUserLoading] = useState(null);
  const [query, setQuery] = useState('');
  const [resetResult, setResetResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [s, u, n, o, l] = await Promise.all([
        api.admin.stats(), api.admin.users(), api.admin.ngos(),
        api.admin.orders(), api.admin.listings()
      ]);
      setStats(s); setUsers(u); setNgos(n); setOrders(o); setListings(l);
      try { setTrends(await api.admin.trends(14)); } catch { setTrends(null); }
      try { setAuditLog(await api.admin.auditLog(50)); } catch { setAuditLog([]); }
    } catch { setLoadError(true); addToast('Failed to load data', 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleOrderAction = async (id, status) => {
    if (status === 'cancelled') {
      const ok = await confirm({ title: 'Cancel this order?', message: 'The listing will become available again for others to reserve.', confirmLabel: 'Cancel Order', variant: 'danger' });
      if (!ok) return;
    }
    setActionLoading(id);
    try {
      await api.admin.updateOrder(id, { status });
      addToast(`Order ${status}`, 'success');
      await loadData();
    } catch { addToast('Failed to update order', 'error'); }
    setActionLoading(null);
  };

  const handleRoleChange = async (id, role) => {
    setUserLoading(id);
    try { await api.admin.updateUser(id, { role }); addToast('Role updated', 'success'); await loadData(); }
    catch (err) { addToast(err.message || 'Failed to update role', 'error'); }
    setUserLoading(null);
  };

  const handleToggleActive = async (u) => {
    const suspending = u.is_active !== false;
    if (suspending) {
      const ok = await confirm({ title: `Suspend ${u.name}?`, message: 'They will be unable to log in until reactivated.', confirmLabel: 'Suspend', variant: 'danger' });
      if (!ok) return;
    }
    setUserLoading(u.id);
    try {
      await api.admin.updateUser(u.id, { isActive: !(u.is_active === false) });
      addToast(u.is_active === false ? 'User reactivated' : 'User suspended', 'success');
      await loadData();
    } catch (err) { addToast(err.message || 'Failed to update user', 'error'); }
    setUserLoading(null);
  };

  const handleDeleteUser = async (u) => {
    const ok = await confirm({ title: `Delete ${u.name}?`, message: 'This permanently removes the user and all their listings and reservations. This cannot be undone.', confirmLabel: 'Delete User', variant: 'danger' });
    if (!ok) return;
    setUserLoading(u.id);
    try { await api.admin.deleteUser(u.id); addToast('User deleted', 'success'); await loadData(); }
    catch (err) { addToast(err.message || 'Failed to delete user', 'error'); }
    setUserLoading(null);
  };

  const handleResetPassword = async (u) => {
    const ok = await confirm({ title: `Reset ${u.name}'s password?`, message: 'A temporary password will be generated and all their active sessions will be signed out. Share the new password securely with the user.', confirmLabel: 'Reset Password', variant: 'danger' });
    if (!ok) return;
    setUserLoading(`pw-${u.id}`);
    try {
      const res = await api.admin.resetUserPassword(u.id, {});
      if (res.password) setResetResult({ name: u.name, email: u.email, password: res.password });
      addToast('Password reset successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to reset password', 'error');
    }
    setUserLoading(null);
  };

  const handleDeleteListing = async (l) => {
    const ok = await confirm({ title: 'Delete this listing?', message: `"${l.title}" will be permanently removed and the donor notified. This cannot be undone.`, confirmLabel: 'Delete Listing', variant: 'danger' });
    if (!ok) return;
    setActionLoading(`del-listing-${l.id}`);
    try { await api.admin.deleteListing(l.id); addToast('Listing deleted', 'success'); await loadData(); }
    catch (err) { addToast(err.message || 'Failed to delete listing', 'error'); }
    setActionLoading(null);
  };

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Log out of admin panel?', confirmLabel: 'Log Out', variant: 'danger' });
    if (!ok) return;
    logout();
    navigate('/');
  };

  const match = (val) => String(val || '').toLowerCase().includes(query.toLowerCase());
  const filteredUsers = query ? users.filter(u => match(u.name) || match(u.email) || match(u.organization) || match(u.role)) : users;
  const filteredNgos = query ? ngos.filter(n => match(n.name) || match(n.organization) || match(n.email)) : ngos;
  const filteredOrders = query ? orders.filter(o => match(o.food_title) || match(o.reserver_name) || match(o.donor_name) || match(o.id)) : orders;
  const filteredListings = query ? listings.filter(l => match(l.title) || match(l.donor_name) || match(l.category) || match(l.status)) : listings;

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active NGOs', value: stats.totalNgos, icon: '🏛️', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Donors', value: stats.totalDonors, icon: '🏪', color: 'from-violet-500 to-violet-600' },
    { label: 'Volunteers', value: stats.totalVolunteers, icon: '🙋', color: 'from-amber-500 to-amber-600' },
    { label: 'Total Listings', value: stats.totalListings, icon: '📋', color: 'from-rose-500 to-rose-600' },
    { label: 'Active Listings', value: stats.activeListings, icon: '🟢', color: 'from-teal-500 to-teal-600' },
    { label: 'Total Orders', value: stats.totalReservations, icon: '📦', color: 'from-orange-500 to-orange-600' },
    { label: 'Pending Orders', value: stats.pendingReservations, icon: '⏳', color: 'from-red-500 to-red-600' },
    { label: 'Meals Saved', value: stats.mealsSaved || 0, icon: '🍽️', color: 'from-green-500 to-green-600' },
  ] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 page-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-red">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-text">Admin Panel</h1>
            <p className="text-subtle text-sm">Manage users, NGOs, orders and listings</p>
          </div>
          <button onClick={handleLogout} className="btn-outline !py-2 !px-4 !text-sm !rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-fade-in-up">
          {tabs.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setQuery(''); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeTab === t ? 'bg-accent text-white shadow-red' : 'bg-white text-subtle hover:bg-accent/5 hover:text-accent border border-border'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab !== 'Overview' && (
          <div className="relative mb-4 animate-fade-in">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${activeTab.toLowerCase()}...`} className="input-field pl-14 !py-2.5 max-w-md" />
          </div>
        )}

        {loadError ? (
          <div className="premium-card p-16 text-center animate-scale-in">
            <div className="text-6xl mb-6 opacity-20">⚠️</div>
            <p className="text-subtle text-lg mb-2 font-medium">Couldn't load admin data</p>
            <button onClick={loadData} className="btn-outline !py-2 !px-4 !text-sm !rounded-xl">Try Again</button>
          </div>
        ) : loading ? (
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

                {trends && trends.series && (
                  <div className="premium-card p-6 mb-8 animate-fade-in">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-text flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent" />Activity (Last 14 Days)</h3>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-subtle"><span className="w-2.5 h-2.5 rounded bg-accent" />Reservations</span>
                        <span className="flex items-center gap-1.5 text-subtle"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />Meals collected</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-40">
                      {trends.series.map((d) => {
                        const max = Math.max(1, ...trends.series.map((s) => s.reservations), ...trends.series.map((s) => s.meals));
                        const rH = Math.round((d.reservations / max) * 100);
                        const mH = Math.round((d.meals / max) * 100);
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                            <div className="w-full flex items-end justify-center gap-0.5 h-full">
                              <div className="w-1.5 rounded-t bg-accent/80 group-hover:bg-accent transition-colors" style={{ height: `${rH}%` }} title={`${d.reservations} reservations`} />
                              <div className="w-1.5 rounded-t bg-emerald-300 group-hover:bg-emerald-400 transition-colors" style={{ height: `${mH}%` }} title={`${d.meals} meals`} />
                            </div>
                            <span className="text-[8px] text-muted">{new Date(d.date).getDate()}</span>
                          </div>
                        );
                      })}
                    </div>
                    {trends.byCategory && trends.byCategory.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
                        <span className="text-xs font-semibold text-subtle uppercase tracking-wider mr-1 self-center">By category:</span>
                        {trends.byCategory.map((c) => (
                          <span key={c.category} className="badge badge-outline text-[10px] capitalize">{c.category} · {c.count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                  <h3 className="font-bold text-text">All Users ({filteredUsers.length}{query && ` of ${users.length}`})</h3>
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
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-subtle uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">{u.name[0]}</div>
                              <span className="text-sm font-semibold text-text">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.email}</td>
                          <td className="py-3 px-6">
                            <select value={u.role} disabled={userLoading === u.id || u.role === 'admin'}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs font-semibold rounded-lg border border-border bg-white px-2 py-1 capitalize text-text focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
                              <option value="donor">donor</option>
                              <option value="ngo">ngo</option>
                              <option value="volunteer">volunteer</option>
                              {u.role === 'admin' && <option value="admin">admin</option>}
                            </select>
                          </td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.organization || '—'}</td>
                          <td className="py-3 px-6 text-sm text-subtle">{u.phone || '—'}</td>
                          <td className="py-3 px-6 text-sm text-subtle">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-6">
                            {u.role === 'admin' ? (
                              <span className="badge badge-outline text-[10px]">Admin</span>
                            ) : (
                              <span className={`badge text-[10px] ${u.is_active === false ? 'badge-red' : 'badge-green'}`}>
                                {u.is_active === false ? 'Suspended' : 'Active'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6">
                            {u.role === 'admin' ? (
                              <span className="text-xs text-muted">—</span>
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => handleToggleActive(u)} disabled={userLoading === u.id}
                                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${u.is_active === false ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                                  {userLoading === u.id ? '...' : u.is_active === false ? 'Activate' : 'Suspend'}
                                </button>
                                <button onClick={() => handleResetPassword(u)} disabled={userLoading === `pw-${u.id}`}
                                  className="px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50">
                                  {userLoading === `pw-${u.id}` ? '...' : 'Reset PW'}
                                </button>
                                <button onClick={() => handleDeleteUser(u)} disabled={userLoading === u.id}
                                  className="px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && <tr><td colSpan={8} className="text-subtle text-sm text-center py-12">No users found</td></tr>}
                    </tbody>
                  </table>
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
                    <h3 className="font-bold text-text">Active NGOs ({filteredNgos.length}{query && ` of ${ngos.length}`})</h3>
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
                        {filteredNgos.map(n => (
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
                        {filteredNgos.length === 0 && <tr><td colSpan={6} className="text-subtle text-sm text-center py-12">No NGOs found</td></tr>}
                      </tbody>
                    </table>
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
                    <h3 className="font-bold text-text">All Orders ({filteredOrders.length}{query && ` of ${orders.length}`})</h3>
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
                        {filteredOrders.map(o => (
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
                        {filteredOrders.length === 0 && <tr><td colSpan={7} className="text-subtle text-sm text-center py-12">No orders found</td></tr>}
                      </tbody>
                    </table>
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
                    <h3 className="font-bold text-text">All Listings ({filteredListings.length}{query && ` of ${listings.length}`})</h3>
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
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredListings.map(l => (
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
                            <td className="py-3 px-4">
                              <button onClick={() => handleDeleteListing(l)} disabled={actionLoading === `del-listing-${l.id}`}
                                className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                                {actionLoading === `del-listing-${l.id}` ? '...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredListings.length === 0 && <tr><td colSpan={7} className="text-subtle text-sm text-center py-12">No listings found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Audit' && (
              <div className="animate-fade-in">
                <div className="premium-card overflow-hidden">
                  <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-text">Security Audit Log</h3>
                    <span className="text-xs text-muted">Last {auditLog.length} events</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Time</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Actor</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Action</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Target</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">Detail</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-subtle uppercase tracking-wider">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.map(a => (
                          <tr key={a.id} className="border-b border-border hover:bg-accent/[0.02] transition-colors">
                            <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 text-sm text-text font-medium capitalize">{a.actor_role || '—'}{a.actor_id ? ` #${a.actor_id}` : ''}</td>
                            <td className="py-3 px-4"><span className="badge badge-outline text-[10px]">{a.action}</span></td>
                            <td className="py-3 px-4 text-xs text-subtle">{a.target_type ? `${a.target_type}${a.target_id ? ` #${a.target_id}` : ''}` : '—'}</td>
                            <td className="py-3 px-4 text-xs text-subtle max-w-[280px] truncate">{a.detail || '—'}</td>
                            <td className="py-3 px-4 text-xs font-mono text-muted">{a.ip || '—'}</td>
                          </tr>
                        ))}
                        {auditLog.length === 0 && <tr><td colSpan={6} className="text-subtle text-sm text-center py-12">No audit events yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {resetResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="pw-title">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResetResult(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 animate-scale-in">
            <h3 id="pw-title" className="text-lg font-bold text-text">Temporary password</h3>
            <p className="text-subtle text-sm mt-1.5">A new password was generated for <span className="font-semibold text-text">{resetResult.name}</span> ({resetResult.email}). Share it securely — it won't be shown again.</p>
            <div className="mt-5 bg-gray-50 border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
              <code className="text-text font-mono text-base break-all select-all">{resetResult.password}</code>
              <button onClick={() => { navigator.clipboard?.writeText(resetResult.password); addToast('Copied to clipboard', 'success'); }} className="btn-outline !py-2 !px-3 !text-xs !rounded-lg flex-shrink-0">Copy</button>
            </div>
            <button onClick={() => setResetResult(null)} className="btn-primary w-full !py-3 !rounded-2xl mt-5">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}