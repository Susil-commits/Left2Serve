'use client';

import { useState } from 'react';
import Link from 'next/link';

const categories = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', desc: 'Surplus meal preps or daily buffet surplus' },
  { value: 'event', label: 'Event / Wedding', icon: '🎉', desc: 'Unserved trays from banquets and weddings' },
  { value: 'hotel', label: 'Hotel & Dining', icon: '🏨', desc: 'High-volume breakfast or lunch buffet recovery' },
  { value: 'caterer', label: 'Caterer', icon: '🍱', desc: 'Pre-packaged box lunches or catering trays' },
  { value: 'household', label: 'Household', icon: '🏠', desc: 'Unopened, packaged groceries or home baking' },
];

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Gluten-Free',
  'Nut-Free',
  'Dairy-Free',
  'Kosher',
];

export default function CreateListingPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'restaurant' | 'event' | 'hotel' | 'caterer' | 'household'>('restaurant');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('servings');
  const [price, setPrice] = useState('0');
  const [expiryDate, setExpiryDate] = useState(() => {
    // Default expiry 4 hours from now
    const d = new Date(Date.now() + 4 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [hasSafetyChecklist, setHasSafetyChecklist] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // States
  const [aiGenerating, setAiGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleDietary = (item: string) => {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  const setQuickExpiry = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setExpiryDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  // AI Description Generator (Calls Gemini API via Backend)
  const handleGenerateDescription = async () => {
    if (!title) {
      setErrorMsg('Please enter a meal title first before generating AI description.');
      return;
    }
    setErrorMsg('');
    setAiGenerating(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    try {
      const res = await fetch(`${apiBase}/api/ai/describe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, category }),
      });

      if (!res.ok) {
        // Fallback generator if token missing or unauthenticated
        const fallbackDesc = `Freshly prepared ${title.toLowerCase()} from our ${category} kitchen. Handled under food safety standards, ready for rapid pickup and community distribution.`;
        setDescription(fallbackDesc);
      } else {
        const data = await res.json();
        setDescription(data.description || data.text || '');
      }
    } catch {
      const fallbackDesc = `Freshly prepared ${title.toLowerCase()} from our ${category} kitchen. Handled under food safety standards, ready for rapid pickup and community distribution.`;
      setDescription(fallbackDesc);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !quantity || !pickupAddress || !hasSafetyChecklist) {
      setErrorMsg('Please fill in all mandatory fields and confirm food safety standards.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'http://localhost:3000';

    const payload = {
      title,
      description,
      category,
      quantity: parseInt(quantity, 10),
      unit,
      price: parseFloat(price) || 0,
      expiry_date: new Date(expiryDate).toISOString(),
      pickup_address: pickupAddress,
      pickup_instructions: pickupInstructions,
      image_urls: imageUrl ? [imageUrl] : [],
      dietary_preferences: dietary,
      has_safety_checklist: hasSafetyChecklist,
      is_template: false,
    };

    try {
      const res = await fetch(`${apiBase}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        // Unauthenticated or not donor role: redirect to SPA login
        window.location.href = `${spaUrl}/login?redirect=/donor/create`;
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to publish listing');
      }

      const created = await res.json();
      setSubmitted(created.id || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Surplus Food Listed Successfully!
        </h1>
        <p className="mt-3 text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
          Your listing has been queued for real-time proximity matching. Local shelters, NGOs, and volunteers within your radius are being notified.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={`/listings/${submitted}`}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow transition-colors"
          >
            View Listing Page →
          </Link>
          <button
            onClick={() => {
              setSubmitted(null);
              setTitle('');
              setDescription('');
            }}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-colors"
          >
            List Another Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-red-600">
          Donor Portal
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
          Donate Surplus Meals
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          List surplus kitchen items in seconds. Powered by Gemini AI for auto-formatting.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            1. Donor Source Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategory(cat.value as typeof category)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-2xl">{cat.icon}</div>
                  <div className="mt-2 font-bold text-xs text-slate-900">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Meal Title & AI Assistant */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            2. Food Description & AI Assist *
          </label>
          <div className="space-y-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20 Fresh Sandwiches, Veg Biryani Trays, Pasta Salad"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />

            <div className="relative">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details on food packaging, temperature upon packaging, ingredients..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors text-slate-800"
              />
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={aiGenerating}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span>✨</span>
                <span>{aiGenerating ? 'AI Generating...' : 'AI Enhance'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quantity, Unit & Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Portions / Quantity *
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="servings">Servings / Meals</option>
              <option value="boxes">Food Boxes</option>
              <option value="trays">Trays</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="items">Individual Items</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Cost to Recipient (₹)
            </label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 (Free Donation)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>

        {/* Expiry Window */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Pickup Expiry Window *
            </label>
            <div className="flex gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setQuickExpiry(2)}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px]"
              >
                +2 Hours
              </button>
              <button
                type="button"
                onClick={() => setQuickExpiry(4)}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px]"
              >
                +4 Hours
              </button>
              <button
                type="button"
                onClick={() => setQuickExpiry(8)}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px]"
              >
                Tonight
              </button>
            </div>
          </div>
          <input
            type="datetime-local"
            required
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        {/* Dietary Preferences */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Dietary Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((item) => {
              const isSelected = dietary.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleDietary(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}{item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Instructions */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pickup Address *
            </label>
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="e.g. 142 Indiranagar 100ft Road, Bangalore"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pickup Instructions (Optional)
            </label>
            <input
              type="text"
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="e.g. Ask for kitchen manager John at rear loading dock"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Photo URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>

        {/* Safety Checklist Toggle */}
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={hasSafetyChecklist}
              onChange={(e) => setHasSafetyChecklist(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
            />
            <div className="text-xs text-emerald-900 leading-relaxed font-medium">
              <span className="font-bold">Food Safety & Hygiene Guarantee:</span> I confirm that this food was prepared under clean, hygienic conditions, stored at safe temperatures, and is packaged in food-safe containers for distribution.
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {submitting ? 'Broadcasting Surplus Food...' : 'Publish Surplus Food Listing →'}
          </button>
          <p className="mt-2.5 text-center text-[11px] text-slate-400">
            Publishing notifies matching NGOs and volunteer drivers within your radius.
          </p>
        </div>
      </form>
    </div>
  );
}
