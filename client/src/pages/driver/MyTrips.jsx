import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { User, MapPin, Flag, Clock, Car, FileText, Navigation, Loader2, CheckCircle2, ArrowRight, Radio } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import './Driver.css';

const statusFlow = ['assigned', 'driver-departed', 'arrived-pickup', 'in-progress', 'completed'];
const swipeLabels = {
  'assigned': "I'm Departing Now",
  'driver-departed': "I've Arrived at Pickup",
  'arrived-pickup': "Passenger Picked Up",
  'in-progress': "Arrived at Destination"
};

export default function DriverMyTrips() {
  const { apiFetch } = useAuth();
  const { socket, locationSharing, startLocationSharing, stopLocationSharing } = useSocket();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTrip, setUpdatingTrip] = useState(null);

  useEffect(() => { loadTrips(); }, []);

  // Auto-start location sharing when driver has active trips
  useEffect(() => {
    const hasActive = trips.some(t =>
      ['driver-departed', 'arrived-pickup', 'in-progress'].includes(t.status)
    );
    if (hasActive && !locationSharing) {
      startLocationSharing();
    } else if (!hasActive && locationSharing) {
      stopLocationSharing();
    }
  }, [trips, locationSharing, startLocationSharing, stopLocationSharing]);

  useEffect(() => {
    if (!socket) return;
    socket.on('trip:assigned', () => loadTrips());
    socket.on('trip:updated', () => loadTrips());
    return () => {
      socket.off('trip:assigned');
      socket.off('trip:updated');
    };
  }, [socket]);

  async function loadTrips() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiFetch(`/trips?date=${today}`);
      setTrips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(trip) {
    const currentIndex = statusFlow.indexOf(trip.status);
    if (currentIndex >= statusFlow.length - 1) return;

    const nextStatus = statusFlow[currentIndex + 1];
    setUpdatingTrip(trip._id);

    try {
      let location = undefined;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // Location not available
      }

      await apiFetch(`/trips/${trip._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus, location })
      });

      if (location && socket) {
        socket.emit('driver:location', location);
      }

      loadTrips();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingTrip(null);
    }
  }

  function openNavigation(address) {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const activeTrips = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTrips = trips.filter(t => t.status === 'completed');

  return (
    <div className="page driver-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>My Trips Today</h1>
        {locationSharing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            background: 'rgba(5,150,105,0.1)', color: '#059669',
            fontSize: 12, fontWeight: 700
          }}>
            <Radio size={13} className="pulse-icon" />
            Live Location Sharing
          </div>
        )}
      </div>

      {activeTrips.length === 0 && completedTrips.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Navigation size={28} /></div>
          <h3>No trips today</h3>
          <p>You'll be notified when a trip is assigned to you</p>
        </div>
      ) : (
        <>
          {activeTrips.map(trip => (
            <div key={trip._id} className="card driver-trip-card">
              <div className="driver-trip-header">
                <h2 className="driver-trip-title">{trip.title}</h2>
                <StatusBadge status={trip.status} />
              </div>

              {trip.passengers.map((p, i) => (
                <div key={p._id || i} className="driver-passenger">
                  <div className="driver-passenger-name">
                    <User size={15} />
                    <span>{p.name || p.user?.name}</span>
                    {p.phone && <span style={{ color: 'var(--color-text-secondary)' }}>{p.phone}</span>}
                  </div>

                  <div className="driver-stop">
                    <button className="driver-nav-btn" onClick={() => openNavigation(p.pickupAddress)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={16} />
                        <span>{p.pickupAddress}</span>
                      </div>
                      <span className="nav-hint">
                        <Navigation size={11} /> Tap to open in Maps
                      </span>
                    </button>
                    <div className="driver-time">
                      <Clock size={14} />
                      Pickup at {new Date(p.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="driver-stop">
                    <button className="driver-nav-btn" onClick={() => openNavigation(p.dropoffAddress)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Flag size={16} />
                        <span>{p.dropoffAddress}</span>
                      </div>
                      <span className="nav-hint">
                        <Navigation size={11} /> Tap to open in Maps
                      </span>
                    </button>
                  </div>
                </div>
              ))}

              {trip.notes && (
                <div className="driver-notes">
                  <FileText size={14} /> {trip.notes}
                </div>
              )}

              {trip.vehicle && (
                <div className="driver-vehicle">
                  <Car size={14} /> {trip.vehicle.name} \u00B7 {trip.vehicle.licensePlate}
                </div>
              )}

              {trip.status !== 'completed' && (
                <button
                  className="btn driver-swipe-btn"
                  onClick={() => updateStatus(trip)}
                  disabled={updatingTrip === trip._id}
                  style={{
                    background: trip.status === 'in-progress' ? 'var(--color-green)' : 'var(--color-primary)',
                    color: 'white',
                    width: '100%',
                    marginTop: 16,
                    fontSize: 15,
                    padding: '16px 24px',
                    minHeight: 56,
                    boxShadow: trip.status === 'in-progress' ? '0 4px 14px rgba(5,150,105,0.35)' : '0 4px 14px rgba(79,70,229,0.35)'
                  }}
                >
                  {updatingTrip === trip._id ? (
                    <><Loader2 size={18} className="spin-icon" /> Updating...</>
                  ) : (
                    <><ArrowRight size={18} /> {swipeLabels[trip.status] || 'Update Status'}</>
                  )}
                </button>
              )}
            </div>
          ))}

          {completedTrips.length > 0 && (
            <>
              <h2 className="section-title" style={{ margin: '24px 0 12px' }}>Completed</h2>
              {completedTrips.map(trip => (
                <div key={trip._id} className="card driver-trip-card completed">
                  <div className="driver-trip-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="var(--color-green)" />
                      {trip.title}
                    </h3>
                    <StatusBadge status="completed" />
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
