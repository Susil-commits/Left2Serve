

export default function ImpactStats({ impact }) {
  if (!impact) return null;
  
  const handleShareTwitter = () => {
    const isDonor = impact.role === 'donor';
    const meals = isDonor ? impact.mealsDonated : impact.mealsReceived;
    const text = `I just helped save ${meals} meals and prevented ${impact.co2Kg}kg of CO2 emissions with Left2Serve! Join the movement to end food waste. 🌍💚 #Left2Serve #FoodWaste #Sustainability`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-lg font-bold text-text">Your Impact</h3>
        </div>
        <button onClick={handleShareTwitter} className="bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
          Share Impact
        </button>
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
