import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from './Toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DonorAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.client.get('/listings/analytics/me');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          addToast('Failed to load analytics', 'error');
        }
      } catch (err) {
        addToast('Network error loading analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [addToast]);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" /></div>;
  }

  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-4">Your Impact Analytics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-accent/5 rounded-xl p-4 border border-accent/10">
          <p className="text-sm text-muted mb-1">Total Listings</p>
          <p className="text-2xl font-bold text-accent">{data.totalListings}</p>
        </div>
        <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/10">
          <p className="text-sm text-muted mb-1">Meals Donated</p>
          <p className="text-2xl font-bold text-green-500">{data.totalDonated}</p>
        </div>
        <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
          <p className="text-sm text-muted mb-1">CO₂ Saved (kg)</p>
          <p className="text-2xl font-bold text-blue-500">{Math.round(data.totalDonated * 2.5)}</p>
        </div>
        <div className="bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/10">
          <p className="text-sm text-muted mb-1">Water Saved (L)</p>
          <p className="text-2xl font-bold text-cyan-500">{data.totalDonated * 1250}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Meals Donated Over Time</h3>
      {data.monthlyStats?.length > 0 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickMargin={10} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f3f4f6' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="meals_saved" stroke="#10b981" fillOpacity={1} fill="url(#colorMeals)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center p-8 bg-background rounded-xl border border-border">
          <p className="text-muted">No completed donations yet. Start sharing food to see your impact!</p>
        </div>
      )}
    </div>
  );
}
