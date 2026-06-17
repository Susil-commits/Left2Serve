import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

const roles = [
  { value: 'donor', icon: '🏪', title: 'Food Donor', desc: 'Restaurants, hotels, caterers, events, households' },
  { value: 'ngo', icon: '🏛️', title: 'NGO / Shelter', desc: 'NGOs, shelters, orphanages receiving food' },
  { value: 'volunteer', icon: '🙋', title: 'Volunteer', desc: 'Individual volunteers helping distribute food' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'donor', phone: '', address: '', organization: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { await register(form); sessionStorage.setItem('prefill_email', form.email); sessionStorage.setItem('prefill_password', form.password); navigate('/login?registered=true'); } catch (err) { setError(err.message); } finally { setLoading(false); } };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white relative py-8 page-transition">
      <div className="absolute inset-0 pattern-dots opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />
      <div className="relative w-full max-w-lg mx-4 animate-scale-in">
        <div className="premium-card-elevated p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-lg mx-auto mb-5 shadow-red hover-glow transition-all">L2</div>
            <h2 className="text-2xl font-bold text-text">Create Account</h2>
            <p className="text-subtle text-sm mt-2">Join the movement to reduce food waste</p>
          </div>
          {error && <div className="bg-accent/5 border border-accent/10 text-accent p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-medium"><svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-subtle mb-2">Full Name *</label><input type="text" value={form.name} onChange={update('name')} required className="input-field" placeholder="John Doe" /></div>
              <div><label className="block text-sm font-semibold text-subtle mb-2">Email *</label><input type="email" value={form.email} onChange={update('email')} required className="input-field" placeholder="john@email.com" /></div>
            </div>
            <div><label className="block text-sm font-semibold text-subtle mb-2">Password *</label><input type="password" value={form.password} onChange={update('password')} required minLength={6} className="input-field" placeholder="Min. 6 characters" /></div>
            <div><label className="block text-sm font-semibold text-subtle mb-3">I am a...</label>
              <div className="space-y-2">{roles.map(r => (
                <label key={r.value} onClick={() => setForm({ ...form, role: r.value })} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${form.role === r.value ? 'bg-accent/5 border-2 border-accent/20 shadow-sm' : 'bg-gray-50 border-2 border-transparent hover:border-border hover:bg-white'}`}>
                  <span className="text-2xl">{r.icon}</span><div className="flex-1"><div className="font-semibold text-sm text-text">{r.title}</div><div className="text-xs text-subtle">{r.desc}</div></div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form.role === r.value ? 'border-accent bg-accent' : 'border-muted'}`}>{form.role === r.value && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                </label>
              ))}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-subtle mb-2">Phone</label><input type="tel" value={form.phone} onChange={update('phone')} className="input-field" placeholder="+1 234 567 890" /></div>
              <div><label className="block text-sm font-semibold text-subtle mb-2">Organization</label><input type="text" value={form.organization} onChange={update('organization')} className="input-field" placeholder="Org name (optional)" /></div>
            </div>
            <div><label className="block text-sm font-semibold text-subtle mb-2">Address</label><input type="text" value={form.address} onChange={update('address')} className="input-field" placeholder="Your address" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-2xl text-base ripple-effect">{loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</span> : 'Create Account'}</button>
          </form>
          <p className="text-center text-sm text-muted mt-6">Already have an account? <Link to="/login" className="text-accent hover:text-accent-dark font-semibold transition-colors">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}