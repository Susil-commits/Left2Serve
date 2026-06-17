import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ImageUpload from '../components/ImageUpload';

const categories = [{ value: 'event', label: 'Event' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'hotel', label: 'Hotel' }, { value: 'caterer', label: 'Caterer' }, { value: 'household', label: 'Household' }];

export default function ListFood() {
  const [form, setForm] = useState({ title: '', description: '', category: 'restaurant', quantity: '', unit: 'servings', price: '0', expiry_date: '', pickup_address: '', pickup_instructions: '', image_urls: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { await api.listings.create({ ...form, quantity: parseInt(form.quantity), price: parseFloat(form.price) || 0 }); navigate('/dashboard'); } catch (err) { setError(err.message); } finally { setLoading(false); } };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 page-transition">
      <div className="mb-8 animate-fade-in"><h1 className="text-4xl font-black tracking-tight text-text mb-2">List <span className="gradient-text-static">Food</span></h1><p className="text-subtle">Share details about surplus food you want to donate</p></div>
      {error && <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium animate-scale-in"><svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>{error}</div>}
      <form onSubmit={handleSubmit} className="premium-card-elevated p-8 space-y-5 animate-fade-in-up">
        <div><label className="block text-sm font-semibold text-subtle mb-2">Title *</label><input type="text" value={form.title} onChange={update('title')} required className="input-field" placeholder="e.g. 50 sandwiches from wedding event" /></div>
        <div><label className="block text-sm font-semibold text-subtle mb-2">Description</label><textarea value={form.description} onChange={update('description')} rows={3} className="input-field" placeholder="Describe the food, packaging, dietary info..." /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold text-subtle mb-2">Category *</label><select value={form.category} onChange={update('category')} className="input-field select-field">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="block text-sm font-semibold text-subtle mb-2">Quantity *</label><input type="number" value={form.quantity} onChange={update('quantity')} required min={1} className="input-field" placeholder="50" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold text-subtle mb-2">Unit</label><select value={form.unit} onChange={update('unit')} className="input-field select-field">{['servings', 'kg', 'boxes', 'plates', 'packets', 'pieces'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          <div><label className="block text-sm font-semibold text-subtle mb-2">Price ($)</label><input type="number" value={form.price} onChange={update('price')} min={0} step="0.01" className="input-field" placeholder="0 for free" /></div>
        </div>
        <div><label className="block text-sm font-semibold text-subtle mb-2">Expiry Date *</label><input type="datetime-local" value={form.expiry_date} onChange={update('expiry_date')} required className="input-field" /></div>
        <div><label className="block text-sm font-semibold text-subtle mb-2">Pickup Address *</label><input type="text" value={form.pickup_address} onChange={update('pickup_address')} required className="input-field" placeholder="Full address for pickup" /></div>
        <div><label className="block text-sm font-semibold text-subtle mb-2">Pickup Instructions</label><textarea value={form.pickup_instructions} onChange={update('pickup_instructions')} rows={2} className="input-field" placeholder="e.g. Ring bell at back entrance, ask for manager..." /></div>
        <div><label className="block text-sm font-semibold text-subtle mb-3">Photos (up to 5)</label><ImageUpload images={form.image_urls} onUpload={(urls) => setForm({ ...form, image_urls: urls })} onRemove={(i) => setForm({ ...form, image_urls: form.image_urls.filter((_, idx) => idx !== i) })} /></div>
        <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">{loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating listing...</span> : 'Publish Listing'}</button>
      </form>
    </div>
  );
}