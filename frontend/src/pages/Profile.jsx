import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import StarRating from '../components/StarRating';

export default function Profile() {
  const { user, updateUser, changePassword } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    organization: user?.organization || '',
    avatar_url: user?.avatar_url || '',
  }));
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [impact, setImpact] = useState(null);
  const [reviews, setReviews] = useState({ average: 0, count: 0, reviews: [] });
  const [setup2FA, setSetup2FA] = useState(null);
  const [token2FA, setToken2FA] = useState('');
  const [toggling2FA, setToggling2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  useEffect(() => {
    if (user && !editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        organization: user.organization || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user, editing]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      api.auth.impact().then(setImpact).catch(() => {});
      if (user.id) api.reviews.forUser(user.id).then(setReviews).catch(() => {});
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.auth.updateProfile(form);
      updateUser(updated);
      setEditing(false);
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordForm);
      addToast('Password changed successfully', 'success');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setShowPassword(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setChangingPassword(false);
  };

  const handleStart2FA = async () => {
    try {
      const res = await api.auth.setup2FA();
      setSetup2FA(res);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setToggling2FA(true);
    try {
      await api.auth.verify2FA({ token: token2FA });
      updateUser({ two_factor_enabled: true });
      setSetup2FA(null);
      setToken2FA('');
      addToast('Two-factor authentication enabled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setToggling2FA(false);
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setToggling2FA(true);
    try {
      await api.auth.disable2FA({ token: token2FA });
      updateUser({ two_factor_enabled: false });
      setShowDisable2FA(false);
      setToken2FA('');
      addToast('Two-factor authentication disabled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setToggling2FA(false);
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('images', file);
    setLoading(true);
    try {
      const res = await api.listings.upload(formData);
      if (res.urls && res.urls[0]) {
        setForm({ ...form, avatar_url: res.urls[0] });
        addToast('Avatar uploaded, click Save Changes to apply', 'success');
      }
    } catch (err) {
      addToast('Failed to upload avatar', 'error');
    }
    setLoading(false);
  };

  const roleIcons = { donor: '🏪', ngo: '🏛️', volunteer: '🙋', admin: '🛡️' };
  const roleLabels = { donor: 'Food Donor', ngo: 'NGO / Shelter', volunteer: 'Volunteer', admin: 'Administrator' };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">My Profile</h1>
        <p className="text-subtle">Manage your account information</p>
      </div>

      <div className="premium-card-elevated p-8 animate-scale-in">
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-2xl font-bold shadow-red flex-shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0] || '?'
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg">{roleIcons[user?.role] || '👤'}</span>
              <span className="text-sm text-subtle capitalize font-medium">{roleLabels[user?.role] || user?.role}</span>
            </div>
            <p className="text-sm text-muted mt-1">{user?.email}</p>
            <p className="text-xs text-muted mt-1">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}</p>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-gray-50 rounded-2xl p-4 border border-border">
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Phone</div>
                <div className="text-sm font-semibold text-text">{user?.phone || 'Not provided'}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-border">
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Organization</div>
                <div className="text-sm font-semibold text-text">{user?.organization || 'Not provided'}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-border">
              <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Address</div>
              <div className="text-sm font-semibold text-text">{user?.address || 'Not provided'}</div>
            </div>
            <button onClick={() => setEditing(true)} className="btn-primary w-full !py-3 !rounded-2xl text-base">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex flex-shrink-0 items-center justify-center overflow-hidden border border-border">
                 {form.avatar_url ? (
                   <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-gray-400">?</span>
                 )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-text mb-1">Profile Picture</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={update('name')} required className="input-field" placeholder="Your name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Phone</label>
                <input type="tel" value={form.phone} onChange={update('phone')} className="input-field" placeholder="+1 234 567 890" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Organization</label>
                <input type="text" value={form.organization} onChange={update('organization')} className="input-field" placeholder="Your organization" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Address</label>
              <input type="text" value={form.address} onChange={update('address')} className="input-field" placeholder="Your address" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3 !rounded-2xl text-base">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {impact && (
        <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-lg font-bold text-text">Your Impact</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {impact.role === 'donor' ? (
              <>
                <ImpactStat value={impact.mealsDonated} label="Meals Donated" icon="🍽️" />
                <ImpactStat value={impact.listingsCreated} label="Listings Posted" icon="📋" />
                <ImpactStat value={impact.activeListings} label="Active Now" icon="🟢" />
                <ImpactStat value={impact.co2Kg} label="kg CO₂ Avoided" icon="🌱" />
              </>
            ) : (
              <>
                <ImpactStat value={impact.mealsReceived} label="Meals Received" icon="🍽️" />
                <ImpactStat value={impact.reservationsMade} label="Reservations" icon="📦" />
                <ImpactStat value={impact.co2Kg} label="kg CO₂ Avoided" icon="🌱" />
                <ImpactStat value={impact.mealsReceived * 1250} label="L Water Saved" icon="💧" />
              </>
            )}
          </div>
        </div>
      )}

      {user?.role !== 'admin' && (
        <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text">Reviews</h3>
            {reviews.count > 0 && <StarRating value={reviews.average} size="sm" showValue count={reviews.count} />}
          </div>
          {reviews.count === 0 ? (
            <p className="text-subtle text-sm">No reviews yet. Reviews appear here after completed pickups transactions.</p>
          ) : (
            <div className="space-y-3">
              {reviews.reviews.map((rv) => (
                <div key={rv.id} className="bg-gray-50 rounded-2xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-text">{rv.reviewer_name || 'Anonymous'}</div>
                    <StarRating value={rv.rating} size="sm" />
                  </div>
                  {rv.comment && <p className="text-subtle text-sm leading-relaxed">{rv.comment}</p>}
                  {rv.food_title && <p className="text-xs text-muted mt-2">on "{rv.food_title}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">Password</h3>
          {!showPassword && (
            <button onClick={() => setShowPassword(true)} className="text-sm text-accent font-semibold hover:text-accent-dark transition-colors">Change</button>
          )}
        </div>
        {showPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Current Password</label>
              <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required className="input-field" placeholder="Enter current password" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">New Password</label>
                <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} required minLength={8} className="input-field" placeholder="Min. 8 characters" />
                <PasswordStrengthMeter value={passwordForm.newPass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Confirm Password</label>
                <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required className="input-field" placeholder="Re-enter new password" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowPassword(false); setPasswordForm({ current: '', newPass: '', confirm: '' }); }} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
              <button type="submit" disabled={changingPassword} className="btn-primary flex-1 !py-3 !rounded-2xl text-base">
                {changingPassword ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Two-Factor Authentication
          </h3>
          <span className={`badge text-xs ${user?.two_factor_enabled ? 'badge-green' : 'badge-gray'}`}>
            {user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-sm text-subtle mb-6">Add an extra layer of security to your account by requiring a code from an authenticator app when you log in.</p>

        {!user?.two_factor_enabled ? (
          !setup2FA ? (
            <button onClick={handleStart2FA} className="btn-primary !py-2 !px-4 !rounded-xl text-sm">Set up 2FA</button>
          ) : (
            <div className="bg-gray-50 border border-border rounded-2xl p-6 animate-slide-up">
              <h4 className="font-semibold text-text mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-subtle mb-4">Open your authenticator app (e.g. Google Authenticator, Authy) and scan this QR code.</p>
              <div className="bg-white p-2 rounded-xl inline-block shadow-sm border border-border mb-4">
                <img src={setup2FA.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
              </div>
              
              <h4 className="font-semibold text-text mb-2">Step 2: Verify Code</h4>
              <p className="text-sm text-subtle mb-4">Enter the 6-digit code generated by your app to confirm setup.</p>
              <form onSubmit={handleVerify2FA} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={token2FA} onChange={e => setToken2FA(e.target.value)} required maxLength={6} className="input-field max-w-[200px] text-center font-mono tracking-widest text-lg" placeholder="000000" />
                <button type="submit" disabled={toggling2FA || token2FA.length < 6} className="btn-primary !py-2.5 !px-6 !rounded-xl text-sm">
                  {toggling2FA ? 'Verifying...' : 'Enable 2FA'}
                </button>
                <button type="button" onClick={() => { setSetup2FA(null); setToken2FA(''); }} className="btn-outline !py-2.5 !px-4 !rounded-xl text-sm">Cancel</button>
              </form>
            </div>
          )
        ) : (
          !showDisable2FA ? (
            <button onClick={() => setShowDisable2FA(true)} className="btn-outline !py-2 !px-4 !rounded-xl text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">Disable 2FA</button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-slide-up">
              <h4 className="font-semibold text-red-800 mb-2">Disable Two-Factor Authentication</h4>
              <p className="text-sm text-red-600/80 mb-4">Please enter a code from your authenticator app to confirm you want to disable 2FA.</p>
              <form onSubmit={handleDisable2FA} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={token2FA} onChange={e => setToken2FA(e.target.value)} required maxLength={6} className="input-field max-w-[200px] text-center font-mono tracking-widest text-lg bg-white border-red-200 focus:ring-red-500/20" placeholder="000000" />
                <button type="submit" disabled={toggling2FA || token2FA.length < 6} className="btn-primary !py-2.5 !px-6 !rounded-xl text-sm !bg-red-600 hover:!bg-red-700 shadow-red !shadow-red-500/30">
                  {toggling2FA ? 'Disabling...' : 'Confirm Disable'}
                </button>
                <button type="button" onClick={() => { setShowDisable2FA(false); setToken2FA(''); }} className="btn-outline !py-2.5 !px-4 !rounded-xl text-sm !border-red-200 !text-red-700 hover:!bg-red-100">Cancel</button>
              </form>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ImpactStat({ value, label, icon }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-border text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black text-text">{Number(value || 0).toLocaleString()}</div>
      <div className="text-xs text-subtle font-medium mt-1">{label}</div>
    </div>
  );
}