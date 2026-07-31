import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import { useToast } from '../Toast';
import { useAuth } from '../AuthContext';

const BADGE_TIERS = {
  bronze: { name: 'Bronze Donor', icon: '🥉', desc: '10+ meals saved' },
  silver: { name: 'Silver Donor', icon: '🥈', desc: '50+ meals saved' },
  gold: { name: 'Gold Donor', icon: '🥇', desc: '100+ meals saved' },
  platinum: { name: 'Platinum Donor', icon: '💎', desc: '500+ meals saved' },
  eco_hero: { name: 'Eco Hero', icon: '🌍', desc: '1000+ meals saved' },
};

const roleIcons = { donor: '🏪', ngo: '🏛️', volunteer: '🙋', admin: '🛡️' };
const roleLabels = { donor: 'Food Donor', ngo: 'NGO / Shelter', volunteer: 'Volunteer', admin: 'Administrator' };

export default function ProfileForm() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    organization: user?.organization || '',
    avatar_url: user?.avatar_url || '',
  });

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
    } catch {
      addToast('Failed to upload avatar', 'error');
    }
    setLoading(false);
  };

  return (
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
          
          {user?.badges && Array.isArray(user.badges) && user.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {user.badges.map(b => BADGE_TIERS[b] && (
                <div key={b} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent-dark rounded-full text-xs font-bold border border-accent/20" title={BADGE_TIERS[b].desc}>
                  <span>{BADGE_TIERS[b].icon}</span>
                  <span>{BADGE_TIERS[b].name}</span>
                </div>
              ))}
            </div>
          )}
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
            {t('profile.edit_profile')}
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
            <label className="block text-sm font-semibold text-text mb-2">{t('profile.name')}</label>
            <input type="text" value={form.name} onChange={update('name')} required className="input-field" placeholder="Your name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">{t('profile.phone')}</label>
              <input type="tel" value={form.phone} onChange={update('phone')} className="input-field" placeholder="+1 234 567 890" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">{t('profile.organization')}</label>
              <input type="text" value={form.organization} onChange={update('organization')} className="input-field" placeholder="Your organization" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('profile.address')}</label>
            <input type="text" value={form.address} onChange={update('address')} className="input-field" placeholder="Your address" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3 !rounded-2xl text-base">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : t('profile.save_changes')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
