import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ImageUpload from '../components/ImageUpload';
import { useToast } from '../components/Toast';

const categories = [
  { value: 'event', label: 'Event', icon: '🎉' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'caterer', label: 'Caterer', icon: '🍱' },
  { value: 'household', label: 'Household', icon: '🏠' },
];

export default function ListFood() {
  const [form, setForm] = useState({
    title: '', description: '', category: 'restaurant', quantity: '', unit: 'servings',
    price: '0', expiry_date: '', pickup_address: '', pickup_instructions: '', image_urls: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const [nowLocal] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.listings.create({ ...form, quantity: parseInt(form.quantity), price: parseFloat(form.price) || 0 });
      addToast('Food listing published successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const isFormValid = form.title && form.category && form.quantity && form.expiry_date && form.pickup_address;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">List <span className="gradient-text-static">Food</span></h1>
        <p className="text-subtle">Share details about surplus food you want to donate</p>
      </div>

      {error && (
        <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium animate-scale-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="premium-card-elevated p-6 sm:p-8 space-y-6 animate-fade-in-up">
        <div className="bg-gray-50 rounded-2xl p-5 border border-border space-y-4">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />Food Details
          </h3>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Title <span className="text-accent">*</span></label>
            <input type="text" value={form.title} onChange={update('title')} required className="input-field" placeholder="e.g. 50 freshly prepared sandwiches" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Description</label>
            <textarea value={form.description} onChange={update('description')} rows={3} className="input-field" placeholder="Describe the food, packaging, dietary info, allergens..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Category <span className="text-accent">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(c => (
                  <button type="button" key={c.value} onClick={() => setForm({ ...form, category: c.value })} aria-pressed={form.category === c.value}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      form.category === c.value ? 'bg-accent/5 border-accent/30 text-accent' : 'bg-white border-border text-subtle hover:border-accent/20'
                    }`}>
                    <span className="text-base">{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Quantity <span className="text-accent">*</span></label>
                <input type="number" value={form.quantity} onChange={update('quantity')} required min={1} className="input-field" placeholder="50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Unit</label>
                <select value={form.unit} onChange={update('unit')} className="input-field select-field">
                  {['servings', 'kg', 'boxes', 'plates', 'packets', 'pieces', 'liters'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">$</span>
              <input type="number" value={form.price} onChange={update('price')} min={0} step="0.01" className="input-field pl-8" placeholder="0 for free" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Expiry Date <span className="text-accent">*</span></label>
            <input type="datetime-local" value={form.expiry_date} onChange={update('expiry_date')} min={nowLocal} required className="input-field" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-border space-y-4">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />Pickup Location
          </h3>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Address <span className="text-accent">*</span></label>
            <input type="text" value={form.pickup_address} onChange={update('pickup_address')} required className="input-field" placeholder="Full address including city and zip code" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Instructions</label>
            <textarea value={form.pickup_instructions} onChange={update('pickup_instructions')} rows={2} className="input-field" placeholder="e.g. Ring bell at back entrance, ask for manager on duty..." />
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-accent" />Photos <span className="text-xs text-muted normal-case font-medium">(up to 5)</span>
          </h3>
          <ImageUpload images={form.image_urls} onUpload={(urls) => setForm({ ...form, image_urls: urls })} onRemove={(i) => setForm({ ...form, image_urls: form.image_urls.filter((_, idx) => idx !== i) })} />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
          <button type="submit" disabled={loading || !isFormValid} className="btn-primary flex-1 !py-3 !rounded-2xl text-base ripple-effect disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing...</span> : 'Publish Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}