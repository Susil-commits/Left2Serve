import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    organization: user?.organization || '',
  }));
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user && !editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        organization: user.organization || '',
      });
    }
  }, [user, editing]);

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
    if (passwordForm.newPass.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.auth.changePassword(passwordForm);
      addToast('Password changed successfully', 'success');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setShowPassword(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setChangingPassword(false);
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

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
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-2xl font-bold shadow-red flex-shrink-0">{user?.name?.[0] || '?'}</div>
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
                <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} required minLength={6} className="input-field" placeholder="Min. 6 characters" />
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
    </div>
  );
}