import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Route, CircleDot, Loader, CheckCircle2, ArrowRight, Inbox, Car, Clock, MapPin, AlertTriangle } from 'lucide-react';
import TripCard from '../../components/TripCard';
import StatusBadge from '../../components/StatusBadge';

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, unassigned: 0, inProgress: 0, completed: 0, pendingRides: 0, activeRides: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  // Listen for new ride requests in real-time
  useEffect(() => {
    if (!socket) return;
    socket.on('rideRequest:new', () => loadData());
    socket.on('rideRequest:updated', () => loadData());
    return () => {
      socket.off('rideRequest:new');
      socket.off('rideRequest:updated');
    };
  }, [socket]);

  async function loadData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [tripData, rideData] = await Promise.all([
        apiFetch(`/trips?date=${today}`),
        apiFetch('/ride-requests')
      ]);
      setTrips(tripData);
      setRideRequests(rideData);

      const pendingRides = rideData.filter(r => r.status === 'pending');
      const activeRides = rideData.filter(r => ['assigned', 'in-progress'].includes(r.status));

      setStats({
        total: tripData.length,
        unassigned: tripData.filter(t => t.status === 'unassigned').length,
        inProgress: tripData.filter(t => ['assigned', 'driver-departed', 'in-progress'].includes(t.status)).length,
        completed: tripData.filter(t => t.status === 'completed').length,
        pendingRides: pendingRides.length,
        activeRides: activeRides.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const upcomingTrips = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const pendingRides = rideRequests.filter(r => r.status === 'pending');

  return (
    <div className="page">
      <h1 className="page-title">Today's Overview</h1>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="stat-card" onClick={() => navigate('/ride-requests')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: stats.pendingRides > 0 ? '#fef3c7' : 'var(--color-gray-light)', color: stats.pendingRides > 0 ? '#d97706' : 'var(--color-text-tertiary)' }}>
            {stats.pendingRides > 0 ? <AlertTriangle size={20} /> : <Car size={20} />}
          </div>
          <div className="stat-value" style={{ color: stats.pendingRides > 0 ? '#d97706' : 'var(--color-text)' }}>{stats.pendingRides}</div>
          <div className="stat-label">Pending Rides</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Route size={20} />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Trips</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-yellow-light)', color: 'var(--color-yellow)' }}>
            <Loader size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-yellow)' }}>{stats.inProgress + stats.activeRides}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-green)' }}>{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Pending Ride Requests */}
      {pendingRides.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#d97706', display: 'inline-block' }} />
              Pending Ride Requests ({pendingRides.length})
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/ride-requests')}>
              Manage <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {pendingRides.slice(0, 5).map(ride => (
              <div key={ride._id} className="card" style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => navigate('/ride-requests')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {ride.requester?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ride.requester?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {ride.pickupLocation} → {ride.dropoffLocation}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={ride.priority} />
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      <Clock size={10} /> {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {pendingRides.length > 5 && (
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }} onClick={() => navigate('/ride-requests')}>
                View all {pendingRides.length} pending requests
              </button>
            )}
          </div>
        </>
      )}

      <div className="section-header">
        <h2 className="section-title">Active Trips</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/trips')}>
          View All <ArrowRight size={14} />
        </button>
      </div>

      {upcomingTrips.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Inbox size={28} />
          </div>
          <h3>All clear!</h3>
          <p>No active trips for today</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcomingTrips.map(trip => (
            <TripCard key={trip._id} trip={trip} onClick={() => navigate(`/trips/${trip._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
