import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Star, TrendingUp, Award, Clock, Car } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SkeletonPage } from '../../components/Skeleton';

export default function DriverPerformance() {
  const { apiFetch } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/analytics/driver-performance')
      .then(setDrivers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonPage />;

  const chartData = drivers.slice(0, 10).map(d => ({
    name: d.name.split(' ')[0],
    trips: d.completedTrips,
    rating: d.avgRating || 0
  }));

  return (
    <div className="page">
      <h1 className="page-title">Driver Performance</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title" style={{ marginBottom: 20 }}>Completed Trips by Driver</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)' }} />
              <Bar dataKey="trips" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {drivers.map((d, i) => (
          <div key={d._id} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: i < 3 ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--color-gray-light)', color: i < 3 ? 'white' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {i < 3 ? <Award size={20} /> : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Car size={12} /> {d.completedTrips} trips</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> {d.completionRate}% rate</span>
                  {d.avgRating && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706' }}>
                      <Star size={12} fill="#d97706" /> {d.avgRating}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {d.totalHours}h</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={`badge ${d.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                  <span className="badge-dot" />
                  {d.isAvailable ? 'Available' : 'Off Duty'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
