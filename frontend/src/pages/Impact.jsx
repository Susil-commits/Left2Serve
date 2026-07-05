import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const useCountUp = (target, duration = 1800, startCounting = true) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting || !target) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, startCounting]);
  return count;
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const count = useCountUp(value, 1800, visible);
  return <span ref={ref} className="highlight-number">{count.toLocaleString()}{suffix}</span>;
};

const MEAL_KG_CO2 = 2.5;
const TREE_KG_PER_YEAR = 21;
const WATER_LITERS_PER_MEAL = 1250;

export default function Impact() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings.getImpact().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { value: data.mealsSaved, label: 'Meals Saved', icon: '🍽️', desc: 'Surplus food redirected from waste to plates', suffix: '' },
    { value: data.co2Kg, label: 'kg CO₂e Avoided', icon: '🌱', desc: `Based on ~${MEAL_KG_CO2} kg CO₂e per meal`, suffix: '' },
    { value: data.trees, label: 'Tree-Years Equivalent', icon: '🌳', desc: `A tree absorbs ~${TREE_KG_PER_YEAR} kg CO₂ per year`, suffix: '' },
    { value: data.waterLiters, label: 'Liters Water Saved', icon: '💧', desc: 'Embedded water in avoided food waste', suffix: '' },
  ] : [];

  return (
    <div className="page-transition">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 pattern-dots opacity-40" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <span className="section-badge">Our Impact</span>
          <h1 className="section-title mb-4">Real <span className="gradient-text-static">Change</span>, Measured</h1>
          <p className="section-subtitle mx-auto">Every reservation completed on Left2Serve keeps edible food out of landfills and feeds people instead. Here is the difference our community has made.</p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-44 rounded-3xl" />)}
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <div key={i} className="premium-card p-7 text-center animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-4xl font-black text-text tracking-tight mb-2"><AnimatedNumber value={s.value} suffix={s.suffix} /></div>
                  <div className="text-sm font-semibold text-text mb-2">{s.label}</div>
                  <div className="text-xs text-subtle leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-card p-16 text-center">
              <div className="text-6xl mb-4 opacity-20">📊</div>
              <p className="text-subtle font-medium">Couldn't load impact data</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-accent/[0.015]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="section-badge">How it's calculated</span>
            <h2 className="section-title mb-4">Transparent Methodology</h2>
            <p className="section-subtitle mx-auto">We use widely cited estimates so our numbers stay honest and verifiable.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🍽️', title: 'Meals saved', body: `Summed from the quantity of every reservation marked "collected". One serving equals one meal.` },
              { icon: '🌱', title: 'CO₂e avoided', body: `Each saved meal avoids roughly ${MEAL_KG_CO2} kg of CO₂-equivalent emissions from production, transport and disposal of wasted food.` },
              { icon: '💧', title: 'Water saved', body: `Producing food that gets thrown away consumes large amounts of water — about ${WATER_LITERS_PER_MEAL} L embedded per meal.` },
            ].map((c, i) => (
              <div key={i} className="premium-card p-7 animate-fade-in" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-bold text-text mb-2">{c.title}</h3>
                <p className="text-subtle text-sm leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative pattern-dots overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/4 rounded-full blur-3xl" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="section-title mb-4">Be Part of the <span className="gradient-text">Numbers</span></h2>
          <p className="section-subtitle mx-auto mb-10">Every listing you post or reserve adds to this impact.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-primary ripple-effect">Get Started</Link>
            <Link to="/browse" className="btn-outline">Browse Food</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
