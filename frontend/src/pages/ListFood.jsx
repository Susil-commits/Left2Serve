import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ImageUpload from '../components/ImageUpload';
import { useToast } from '../components/Toast';
import MapWrapper from '../components/MapWrapper';
import { useTranslation } from 'react-i18next';

const categories = [
  { value: 'event', label: 'Event', icon: '🎉' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'caterer', label: 'Caterer', icon: '🍱' },
  { value: 'household', label: 'Household', icon: '🏠' },
];

const dietaryOptions = ['Vegan', 'Vegetarian', 'Halal', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

export default function ListFood() {
  const [form, setForm] = useState({
    title: '', description: '', category: 'restaurant', quantity: '', unit: 'servings',
    price: '0', expiry_date: '', pickup_address: '', pickup_instructions: '', image_urls: [], dietary_preferences: [],
    has_safety_checklist: false, is_template: false
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  
  const toggleDietary = (tag) => {
    setForm(prev => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(tag) 
        ? prev.dietary_preferences.filter(t => t !== tag) 
        : [...prev.dietary_preferences, tag]
    }));
  };

  const [nowLocal] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.client.get('/listings/templates');
        setTemplates(data.data);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  const applyTemplate = (t) => {
    setForm({
      ...form,
      title: t.title,
      description: t.description || '',
      category: t.category,
      quantity: t.quantity,
      unit: t.unit,
      price: t.price,
      pickup_address: t.pickup_address,
      pickup_instructions: t.pickup_instructions || '',
      image_urls: t.image_urls || [],
      dietary_preferences: t.dietary_preferences || [],
      has_safety_checklist: t.has_safety_checklist || false,
      is_template: false
    });
    addToast('Template applied!', 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.listings.create({ 
        ...form, 
        quantity: parseInt(form.quantity), 
        price: parseFloat(form.price) || 0,
        latitude: position ? position[0] : null,
        longitude: position ? position[1] : null
      });
      addToast('Food listing published successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleGenerateDescription = async () => {
    if (!form.title || !form.category) {
      addToast('Please enter a title and select a category first', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.client.post('/ai/describe', { title: form.title, category: form.category });
      setForm(prev => ({ ...prev, description: res.data.description }));
      addToast('Description generated!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to generate description', 'error');
    }
    setAiLoading(false);
  };

  const handleAnalyzeImage = async () => {
    if (!form.image_urls || form.image_urls.length === 0) {
      addToast('Please upload an image first', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.listings.analyzeImage({ imageUrl: form.image_urls[0] });
      setForm(prev => ({ 
        ...prev, 
        title: res.title || prev.title, 
        description: res.description || prev.description, 
        category: res.category || prev.category 
      }));
      addToast('AI successfully analyzed the image!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || err.message || 'Failed to analyze image', 'error');
    }
    setAiLoading(false);
  };

  const isFormValid = form.title && form.category && form.quantity && form.expiry_date && form.pickup_address && form.has_safety_checklist;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2"><span className="gradient-text-static">{t('list_food.title')}</span></h1>
        <p className="text-subtle">{t('list_food.subtitle')}</p>
      </div>

      {templates.length > 0 && (
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-3">
            {templates.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)} className="flex-shrink-0 bg-white border border-border rounded-xl p-3 text-left hover:border-accent hover:shadow-sm transition-all min-w-[200px]">
                <div className="text-xs text-accent font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Template
                </div>
                <div className="font-bold text-text truncate">{t.title}</div>
                <div className="text-xs text-subtle truncate mt-0.5">{t.category} • {t.quantity} {t.unit}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium animate-scale-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="premium-card-elevated p-6 sm:p-8 space-y-6 animate-fade-in-up">
        <div className="bg-gray-50 rounded-2xl p-5 border border-border space-y-4">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />{t('list_food.food_details')}
          </h3>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.title_label')} <span className="text-accent">*</span></label>
            <input type="text" value={form.title} onChange={update('title')} required className="input-field" placeholder="e.g. 50 freshly prepared sandwiches" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-text">{t('list_food.description_label')}</label>
              <button type="button" onClick={handleGenerateDescription} disabled={aiLoading} className="text-xs font-semibold text-accent flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Auto-Describe
              </button>
            </div>
            <textarea value={form.description} onChange={update('description')} rows={3} className="input-field" placeholder="Describe the food, packaging, dietary info, allergens..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">{t('list_food.category_label')} <span className="text-accent">*</span></label>
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
                <label className="block text-sm font-semibold text-text mb-2">{t('list_food.quantity_label')} <span className="text-accent">*</span></label>
                <input type="number" value={form.quantity} onChange={update('quantity')} required min={1} className="input-field" placeholder="50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">{t('list_food.unit_label')}</label>
                <select value={form.unit} onChange={update('unit')} className="input-field select-field">
                  {['servings', 'kg', 'boxes', 'plates', 'packets', 'pieces', 'liters'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.dietary_label')}</label>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map(tag => (
                <button type="button" key={tag} onClick={() => toggleDietary(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    form.dietary_preferences.includes(tag) 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm' 
                    : 'bg-white border-border text-subtle hover:border-emerald-200 hover:text-emerald-600'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.price_label')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">$</span>
              <input type="number" value={form.price} onChange={update('price')} min={0} step="0.01" className="input-field pl-8" placeholder="0 for free" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.expiry_label')} <span className="text-accent">*</span></label>
            <input type="datetime-local" value={form.expiry_date} onChange={update('expiry_date')} min={nowLocal} required className="input-field" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-border space-y-4">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />{t('list_food.pickup_location')}
          </h3>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.address_label')} <span className="text-accent">*</span></label>
            <input type="text" value={form.pickup_address} onChange={update('pickup_address')} required className="input-field" placeholder="Full address including city and zip code" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-text">Pinpoint Location</label>
              <button type="button" onClick={() => {
                if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setPosition([p.coords.latitude, p.coords.longitude]))
              }} className="text-xs text-blue-600 hover:underline">Use Current Location</button>
            </div>
            <div className="h-48 rounded-xl overflow-hidden border border-border">
              <MapWrapper pickerMode={true} position={position} setPosition={setPosition} />
            </div>
            <p className="text-xs text-subtle mt-1">Click on the map to set the exact coordinates for the interactive map.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">{t('list_food.instructions_label')}</label>
            <textarea value={form.pickup_instructions} onChange={update('pickup_instructions')} rows={2} className="input-field" placeholder="e.g. Ring bell at back entrance, ask for manager on duty..." />
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />{t('list_food.photos')} <span className="text-xs text-muted normal-case font-medium">(up to 5)</span>
            </h3>
            {form.image_urls.length > 0 && (
              <button type="button" onClick={handleAnalyzeImage} disabled={aiLoading} className="text-xs font-semibold text-accent flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline bg-accent/10 px-2 py-1 rounded-md">
                {aiLoading ? '⏳ Analyzing...' : '✨ Auto-fill with AI'}
              </button>
            )}
          </div>
          <ImageUpload images={form.image_urls} onUpload={(urls) => setForm({ ...form, image_urls: urls })} onRemove={(i) => setForm({ ...form, image_urls: form.image_urls.filter((_, idx) => idx !== i) })} />
        </div>

        <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
          <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-orange-500" />Food Safety Checklist
          </h3>
          <div className="space-y-3 mb-4 text-sm text-orange-800">
            <p>Please verify the following before donating:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Food has been stored at appropriate safe temperatures.</li>
              <li>Food has not expired and is safe for human consumption.</li>
              <li>Packaging is clean and secure to prevent contamination.</li>
              <li>Allergens are clearly stated if known.</li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.has_safety_checklist} onChange={(e) => setForm({ ...form, has_safety_checklist: e.target.checked })} className="mt-1 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent" />
            <span className="text-sm font-semibold text-orange-900 leading-tight">I confirm that this food meets safety standards and is safe for consumption. <span className="text-accent">*</span></span>
          </label>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_template} onChange={(e) => setForm({ ...form, is_template: e.target.checked })} className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent" />
            <span className="text-sm font-semibold text-text">Save this listing as a template for future use (it will still be published now)</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1 !py-3 !rounded-2xl">{t('list_food.cancel')}</button>
          <button type="submit" disabled={loading || !isFormValid} className="btn-primary flex-1 !py-3 !rounded-2xl text-base ripple-effect disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing...</span> : t('list_food.publish')}
          </button>
        </div>
      </form>
    </div>
  );
}