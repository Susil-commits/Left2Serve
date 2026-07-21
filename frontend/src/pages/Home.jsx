import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { api } from '../api';

const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); } }); }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

const useCountUp = (target, duration = 2000, startCounting = true) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, startCounting]);
  return count;
};

const AnimatedStat = ({ value, label, suffix = '+' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const count = useCountUp(value, 2000, visible);
  return (
    <div ref={ref}><div className="text-2xl font-bold text-text highlight-number">{count}{suffix}</div><div className="text-sm text-subtle">{label}</div></div>
  );
};

const AnimatedStatInline = ({ value, suffix = '+' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const count = useCountUp(value, 2000, visible);
  return <span ref={ref} className="highlight-number">{count.toLocaleString()}{suffix}</span>;
};

const categories = [
  { icon: '🎉', label: 'Events', desc: 'Surplus food from weddings, conferences, and parties', link: '/browse?category=event' },
  { icon: '🍽️', label: 'Restaurants', desc: 'Fresh meals from local restaurants and eateries', link: '/browse?category=restaurant' },
  { icon: '🏨', label: 'Hotels', desc: 'Buffet leftovers and banquet surplus', link: '/browse?category=hotel' },
  { icon: '🍱', label: 'Caterers', desc: 'Catered meals and event leftovers', link: '/browse?category=caterer' },
  { icon: '🏠', label: 'Households', desc: 'Home-cooked surplus and groceries', link: '/browse?category=household' },
];
const faqItems = [
  { q: 'How does Left2Serve work?', a: 'Food donors list surplus food with details like quantity, type, and pickup location. Nearby receivers and volunteers are notified instantly and can claim the listing for pickup.' },
  { q: 'Is the platform free to use?', a: 'Yes! Left2Serve is completely free for both donors and receivers. We believe in making food redistribution accessible to everyone without any barriers.' },
  { q: 'Who can donate food?', a: 'Restaurants, caterers, grocery stores, bakeries, event organizers, and individuals with surplus food that is safe to consume can donate.' },
  { q: 'How is food safety ensured?', a: 'Donors are responsible for verifying food safety. We provide guidelines on proper storage, handling, and transportation. All listings include expiry dates and pickup instructions.' },
  { q: 'How do I track my donations?', a: 'Our dashboard provides real-time tracking of all donations, including pickup status, receiver details, and impact metrics. See how many meals you have helped save.' },
];

export default function Home() {
  useScrollReveal();
  const [openFaq, setOpenFaq] = useState(null);
  const [stats, setStats] = useState({ mealsSaved: 0, totalDonors: 0, totalReceivers: 0, activeListings: 0 });
  const [showNotice, setShowNotice] = useState(false);
  const [serverAwake, setServerAwake] = useState(false);

  useEffect(() => {
    let isFast = true;
    const noticeTimeout = setTimeout(() => {
      isFast = false;
      setShowNotice(true);
    }, 1500); // Delay showing to avoid impacting initial render (FCP/LCP)

    api.listings.getStats().then((data) => {
      setStats(data);
      setServerAwake(true);
      if (isFast) {
        clearTimeout(noticeTimeout); // Never show if it loaded quickly
      } else {
        setTimeout(() => setShowNotice(false), 5000); // Hide 5 seconds after waking up
      }
    }).catch(() => {});

    return () => clearTimeout(noticeTimeout);
  }, []);

  return (
    <div className="overflow-hidden page-transition">
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-40" />
        <div className="absolute top-20 left-10 w-80 h-80 bg-accent/4 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/2 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] border border-accent/8 rounded-full animate-rotate-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-accent/4 rounded-full animate-rotate-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal-left">
              <div className="hero-badge mb-6"><span className="w-2 h-2 bg-accent rounded-full animate-pulse" />Making a difference, one meal at a time</div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.06] tracking-[-0.04em] text-text mb-6 text-balance">Share Food,<br /><span className="gradient-text">Reduce Waste,</span><br />Feed Communities</h1>
              <p className="section-subtitle mb-8 text-lg">Left2Serve connects surplus food with those who need it most. Join a network of restaurants, shelters, and volunteers fighting hunger and food waste together.</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-primary ripple-effect">Get Started Free</Link>
                <Link to="/browse" className="btn-outline">Browse Listings</Link>
              </div>
              <div className="flex gap-8 mt-10 pt-8 border-t border-border">
                <AnimatedStat value={stats.mealsSaved} label="Meals Saved" />
                <AnimatedStat value={stats.totalDonors} label="Active Donors" />
                <AnimatedStat value={stats.totalReceivers} label="Receivers" />
              </div>
              
              {showNotice && !serverAwake && (
                <div role="status" aria-live="polite" className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-accent/[0.08] to-transparent border border-accent/20 backdrop-blur-md relative overflow-hidden flex items-start gap-4 shadow-sm animate-fade-in">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent"></div>
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="relative flex h-3.5 w-3.5" aria-hidden="true">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent"></span>
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text text-sm mb-1 flex items-center gap-2">
                      Connecting to Database <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20 uppercase tracking-wider">Free Tier</span>
                    </h4>
                    <p className="text-xs text-subtle leading-relaxed max-w-sm">
                      Our backend is waking up from inactivity. It may take a few moments. Statistics will update automatically once live.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="reveal-right relative flex justify-center">
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-dark rounded-3xl opacity-10 animate-float" style={{ animationDelay: '0.8s' }} />
                <div className="absolute inset-4 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border hover-glow group">
                  <div className="text-center">
                    <div className="text-7xl mb-4 group-hover-rotate">🍽️</div>
                    <div className="gradient-text-static text-2xl font-bold">Left2Serve</div>
                    <div className="text-subtle text-sm mt-2">Food Redistribution Network</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal"><span className="section-badge">How It Works</span><h2 className="section-title mb-4">Three Simple Steps</h2><p className="section-subtitle mx-auto">Getting food to those who need it has never been easier.</p></div>
          <div className="grid md:grid-cols-3 gap-8 relative timeline-line">
            {[
              { step: '01', icon: '📋', title: 'List Your Food', desc: 'Post surplus food with details', features: ['Quantity & type', 'Pickup location', 'Expiry time', 'Photo upload'] },
              { step: '02', icon: '🔔', title: 'Get Matched', desc: 'Nearby receivers browse and reserve', features: ['Browse listings', 'Smart filtering', 'Category search', 'Instant reservations'] },
              { step: '03', icon: '🤝', title: 'Pickup & Complete', desc: 'Coordinate and confirm pickup', features: ['Pickup coordination', 'Status tracking', 'Order management', 'Impact dashboard'] },
            ].map((item, i) => (
              <div key={i} className="premium-card card-hover-lift p-8 relative z-10 reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="flex items-center justify-between mb-5"><div className="icon-circle">{item.icon}</div><span className="text-4xl font-extrabold text-accent/8">{item.step}</span></div>
                <h3 className="text-xl font-bold text-text mb-2">{item.title}</h3><p className="text-subtle text-sm mb-5">{item.desc}</p>
                <ul className="space-y-2">{item.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm text-subtle"><span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />{f}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-accent/[0.015]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal"><span className="section-badge">Who Can Participate</span><h2 className="section-title mb-4">Everyone Has a Role</h2><p className="section-subtitle mx-auto">Whether you have food to give or need food to receive, Left2Serve connects you.</p></div>
          <div className="grid md:grid-cols-2 gap-10">
            {[{ title: 'Food Donors', desc: 'Restaurants, caterers, grocery stores, and individuals with surplus food can list it for pickup. Reduce waste and make an impact.', tags: ['Restaurants', 'Bakeries', 'Caterers', 'Events', 'Individuals'], icon: <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg> }, { title: 'Receivers & Volunteers', desc: 'Shelters, community kitchens, NGOs, and volunteers can browse nearby listings and pick up food for distribution.', tags: ['Shelters', 'NGOs', 'Volunteers', 'Community Kitchens', 'Food Banks'], icon: <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> }].map((panel, i) => (
              <div key={i} className={`premium-card-elevated p-10 ${i === 0 ? 'reveal-left' : 'reveal-right'}`}>
                <div className="icon-circle mb-6">{panel.icon}</div>
                <h3 className="text-2xl font-bold text-text mb-3">{panel.title}</h3><p className="text-subtle leading-relaxed mb-6">{panel.desc}</p>
                <div className="flex flex-wrap gap-2">{panel.tags.map((t) => <span key={t} className="badge badge-red">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-accent/[0.015]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal"><span className="section-badge">Categories</span><h2 className="section-title mb-4">Find What You Need</h2><p className="section-subtitle mx-auto">Browse food listings by category to find exactly what you are looking for.</p></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {categories.map((c, i) => (
              <Link key={c.label} to={c.link} className="premium-card card-hover-lift p-6 text-center reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-4 group-hover-rotate">{c.icon}</div>
                <h3 className="font-bold text-text mb-2">{c.label}</h3>
                <p className="text-xs text-subtle leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-accent/[0.015]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 reveal"><span className="section-badge">Our Impact</span><h2 className="section-title mb-4">Making a Real <span className="gradient-text-static">Difference</span></h2><p className="section-subtitle mx-auto">Every meal shared creates a ripple effect of positive change in communities.</p></div>
          <div className="text-center mb-10 reveal"><Link to="/impact" className="btn-outline">See full impact report →</Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { value: stats.mealsSaved, label: 'Meals Saved', icon: '🍽️', desc: 'Redirected from waste to plates' },
              { value: stats.totalDonors, label: 'Active Donors', icon: '🏪', desc: 'Businesses & individuals giving back' },
              { value: stats.totalReceivers, label: 'Receivers', icon: '🏛️', desc: 'Shelters & community kitchens' },
            ].map((item, i) => (
              <div key={i} className="premium-card p-6 text-center reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-3xl font-black text-text tracking-tight mb-1"><AnimatedStatInline value={item.value} /></div>
                <div className="text-sm font-semibold text-text mb-1">{item.label}</div>
                <div className="text-xs text-subtle">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14 reveal"><span className="section-badge">FAQ</span><h2 className="section-title mb-4">Frequently Asked Questions</h2><p className="section-subtitle mx-auto">Everything you need to know about Left2Serve.</p></div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="premium-card overflow-hidden reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <button className="w-full flex items-center justify-between p-5 text-left font-semibold text-text" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <svg className={`w-5 h-5 text-accent transition-transform duration-400 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className={`faq-answer ${openFaq === i ? 'open' : ''}`}><p className="px-5 pb-5 text-subtle text-sm leading-relaxed">{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative pattern-dots overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/4 rounded-full blur-3xl" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="reveal">
            <span className="section-badge">Join The Movement</span>
            <h2 className="section-title mb-4">Ready to Make a <span className="gradient-text">Difference?</span></h2>
            <p className="section-subtitle mx-auto mb-10">Join donors and receivers using Left2Serve to reduce food waste and feed communities.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-primary ripple-effect">Start Donating</Link>
              <Link to="/browse" className="btn-outline">Find Food Near You</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}