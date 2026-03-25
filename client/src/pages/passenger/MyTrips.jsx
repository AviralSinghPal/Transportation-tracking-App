import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { User, Phone, Car, MapPin, Clock, Flag, Clapperboard, Star } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const statusMessages = {
  'unassigned': 'Your trip is being arranged. A driver will be assigned shortly.',
  'assigned': 'A driver has been assigned! They will depart for your pickup soon.',
  'driver-departed': 'Your driver is on the way! They should arrive at your pickup point soon.',
  'arrived-pickup': 'Your driver has arrived at the pickup point! Please head to the vehicle.',
  'in-progress': 'You are on your way to the destination.',
  'completed': 'Trip completed. Have a great shoot!',
  'cancelled': 'This trip has been cancelled.'
};

const statusBg = {
  'driver-departed': 'var(--color-blue-light)',
  'arrived-pickup': 'var(--color-green-light)',
};

export default function PassengerMyTrips() {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratedTrips, setRatedTrips] = useState({});

  useEffect(() => { loadTrips(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('trip:updated', () => loadTrips());
    return () => socket.off('trip:updated');
  }, [socket]);

  async function loadTrips() {
    try {
      const data = await apiFetch('/trips');
      setTrips(data);
      for (const trip of data) {
        if (trip.status === 'completed' && trip.driver) {
          try {
            const check = await apiFetch(`/ratings/trip/${trip._id}/check`);
            if (check.hasRated) setRatedTrips(prev => ({ ...prev, [trip._id]: check.rating }));
          } catch {}
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function submitRating() {
    if (!ratingTrip || !ratingValue) return;
    try {
      await apiFetch('/ratings', {
        method: 'POST',
        body: JSON.stringify({
          tripId: ratingTrip._id,
          ratedUserId: ratingTrip.driver._id || ratingTrip.driver,
          rating: ratingValue,
          comment: ratingComment
        })
      });
      setRatedTrips(prev => ({ ...prev, [ratingTrip._id]: { rating: ratingValue } }));
      setRatingTrip(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (err) { alert(err.message); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const todayTrips = trips.filter(t => new Date(t.date).toDateString() === new Date().toDateString());

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <h1 className="page-title">My Trips</h1>

      {todayTrips.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Clapperboard size={28} /></div>
          <h3>No trips scheduled</h3>
          <p>You'll be notified when a trip is arranged for you</p>
        </div>
      ) : (
        todayTrips.map(trip => (
          <div key={trip._id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>{trip.title}</h2>
              <StatusBadge status={trip.status} />
            </div>

            <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: statusBg[trip.status] || 'var(--color-gray-light)', marginBottom: 16, fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
              {statusMessages[trip.status]}
            </div>

            {trip.driver && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Driver</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 600 }}>
                  <User size={16} color="var(--color-text-tertiary)" /> {trip.driver.name}
                </div>
                {trip.driver.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    <Phone size={13} color="var(--color-text-tertiary)" /> {trip.driver.phone}
                  </div>
                )}
              </div>
            )}

            {trip.vehicle && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}>
                  <Car size={15} color="var(--color-text-tertiary)" /> {trip.vehicle.name} · {trip.vehicle.licensePlate}
                </div>
              </div>
            )}

            {trip.passengers.map((p, i) => (
              <div key={p._id || i} style={{ padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <MapPin size={14} color="var(--color-text-tertiary)" /> {p.pickupAddress}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <Clock size={14} color="var(--color-text-tertiary)" /> {new Date(p.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <Flag size={14} color="var(--color-text-tertiary)" /> {p.dropoffAddress}
                </div>
              </div>
            ))}

            {/* Rating for completed trips */}
            {trip.status === 'completed' && trip.driver && (
              <div style={{ marginTop: 16, padding: 14, background: 'var(--color-gray-light)', borderRadius: 'var(--radius-sm)' }}>
                {ratedTrips[trip._id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                    <Star size={16} fill="#d97706" color="#d97706" />
                    You rated this trip {ratedTrips[trip._id].rating}/5
                  </div>
                ) : ratingTrip?._id === trip._id ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Rate your driver</div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRatingValue(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Star size={28} fill={n <= ratingValue ? '#d97706' : 'none'} color="#d97706" />
                        </button>
                      ))}
                    </div>
                    <input className="form-input" placeholder="Leave a comment (optional)" value={ratingComment} onChange={e => setRatingComment(e.target.value)} style={{ marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={submitRating} disabled={!ratingValue}>Submit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setRatingTrip(null); setRatingValue(0); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setRatingTrip(trip)}>
                    <Star size={14} /> Rate your driver
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
