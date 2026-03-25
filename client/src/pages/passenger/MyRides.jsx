import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MapPin, Clock, Car, Navigation, Radio, User, ArrowRight, Phone, PhoneCall, Shield } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function MyRides() {
  const { apiFetch, user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myDriver, setMyDriver] = useState(null);
  const [showCallForm, setShowCallForm] = useState(false);
  const [callForm, setCallForm] = useState({ pickupLocation: '', dropoffLocation: '', notes: '' });
  const [callingDriver, setCallingDriver] = useState(false);

  useEffect(() => { loadRides(); loadMyDriver(); }, []);

  async function loadMyDriver() {
    try {
      const data = await apiFetch('/allocations/my-driver');
      setMyDriver(data?.driver || null);
    } catch { /* no PA */ }
  }

  async function handleGiveCall(e) {
    e.preventDefault();
    if (!callForm.pickupLocation.trim() || !callForm.dropoffLocation.trim()) return;
    setCallingDriver(true);
    try {
      await apiFetch('/ride-requests/call', {
        method: 'POST',
        body: JSON.stringify(callForm)
      });
      setShowCallForm(false);
      setCallForm({ pickupLocation: '', dropoffLocation: '', notes: '' });
      loadRides();
    } catch (err) {
      alert(err.message);
    } finally {
      setCallingDriver(false);
    }
  }

  useEffect(() => {
    if (!socket) return;
    socket.on('rideRequest:updated', () => loadRides());
    socket.on('rideRequest:assigned', () => loadRides());
    return () => {
      socket.off('rideRequest:updated');
      socket.off('rideRequest:assigned');
    };
  }, [socket]);

  async function loadRides() {
    try {
      const data = await apiFetch('/ride-requests');
      setRides(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const activeRides = rides.filter(r => !['completed', 'cancelled', 'rejected'].includes(r.status));
  const pastRides = rides.filter(r => ['completed', 'cancelled', 'rejected'].includes(r.status));

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <h1 className="page-title">My Rides</h1>

      {/* My Driver Card */}
      {myDriver && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <Shield size={14} color="#059669" />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#059669' }}>
              My Permanent Driver
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
              {myDriver.name?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{myDriver.name}</div>
              {myDriver.phone && (
                <a href={`tel:${myDriver.phone}`} style={{ fontSize: 13, color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> {myDriver.phone}
                </a>
              )}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: myDriver.permanentAllocation?.isTemporaryRelease ? '#fef3c7' : '#dcfce7',
              color: myDriver.permanentAllocation?.isTemporaryRelease ? '#92400e' : '#166534'
            }}>
              {myDriver.permanentAllocation?.isTemporaryRelease ? 'Temp Away' : myDriver.isAvailable ? 'Available' : 'Busy'}
            </div>
          </div>

          {myDriver.permanentAllocation?.vehicle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--color-gray-light)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              <Car size={14} color="var(--color-text-tertiary)" />
              <span style={{ fontWeight: 600 }}>{myDriver.permanentAllocation.vehicle.name || 'Vehicle'}</span>
              {myDriver.permanentAllocation.vehicle.licensePlate && (
                <span style={{ color: 'var(--color-text-secondary)' }}>· {myDriver.permanentAllocation.vehicle.licensePlate}</span>
              )}
            </div>
          )}

          {myDriver.permanentAllocation?.isTemporaryRelease ? (
            <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
              Your driver is temporarily assigned elsewhere. Use "Request Ride" instead.
            </div>
          ) : !showCallForm ? (
            <button
              onClick={() => setShowCallForm(true)}
              style={{
                width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer',
                background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
              }}
            >
              <PhoneCall size={18} /> Give Call
            </button>
          ) : (
            <form onSubmit={handleGiveCall}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="form-input" placeholder="Pickup location" value={callForm.pickupLocation} onChange={e => setCallForm({...callForm, pickupLocation: e.target.value})} required />
                <input className="form-input" placeholder="Dropoff location" value={callForm.dropoffLocation} onChange={e => setCallForm({...callForm, dropoffLocation: e.target.value})} required />
                <input className="form-input" placeholder="Notes (optional)" value={callForm.notes} onChange={e => setCallForm({...callForm, notes: e.target.value})} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#059669' }} disabled={callingDriver}>
                    {callingDriver ? 'Calling...' : 'Confirm Call'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCallForm(false)}>Cancel</button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {rides.length === 0 && !myDriver ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Car size={28} /></div>
          <h3>No ride requests</h3>
          <p>Use the "Request Ride" button in the top bar to request a ride</p>
        </div>
      ) : (
        <>
          {activeRides.map(ride => (
            <div key={ride._id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    <Clock size={12} style={{ verticalAlign: '-1px' }} /> {new Date(ride.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <StatusBadge status={ride.status} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <MapPin size={15} color="#4f46e5" />
                  <span style={{ fontWeight: 600 }}>{ride.pickupLocation}</span>
                </div>
                <div style={{ marginLeft: 7, borderLeft: '2px dashed var(--color-border)', height: 12 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <MapPin size={15} color="#dc2626" />
                  <span style={{ fontWeight: 600 }}>{ride.dropoffLocation}</span>
                </div>
              </div>

              {ride.assignedDriver && (
                <div style={{
                  padding: '10px 12px', background: 'var(--color-gray-light)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} color="var(--color-text-tertiary)" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ride.assignedDriver.name}</div>
                      {ride.assignedDriver.phone && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{ride.assignedDriver.phone}</div>
                      )}
                    </div>
                  </div>
                  {ride.assignedVehicle && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Car size={13} /> {ride.assignedVehicle.name}
                    </div>
                  )}
                </div>
              )}

              {ride.eta && ride.status === 'assigned' && (
                <div style={{
                  padding: '8px 12px', background: 'rgba(79,70,229,0.08)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 12,
                  fontSize: 13, fontWeight: 600, color: '#4f46e5',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <Clock size={14} /> ETA: {ride.eta} min
                </div>
              )}

              {/* Track Driver button for assigned/in-progress rides */}
              {['assigned', 'in-progress'].includes(ride.status) && ride.assignedDriver && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/track/${ride._id}`)}
                  style={{
                    width: '100%', padding: '14px', fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
                  }}
                >
                  <Radio size={16} className="pulse-icon" />
                  Track Driver Live
                  <ArrowRight size={16} />
                </button>
              )}

              {ride.status === 'pending' && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(234,179,8,0.08)',
                  borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#a16207',
                  fontWeight: 500, textAlign: 'center'
                }}>
                  Waiting for coordinator approval...
                </div>
              )}

              {ride.status === 'approved' && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(79,70,229,0.08)',
                  borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#4f46e5',
                  fontWeight: 500, textAlign: 'center'
                }}>
                  Approved — assigning a driver...
                </div>
              )}
            </div>
          ))}

          {pastRides.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '20px 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Past Rides
              </h2>
              {pastRides.slice(0, 10).map(ride => (
                <div key={ride._id} className="card" style={{ marginBottom: 8, opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{ride.pickupLocation}</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}> → </span>
                      <span style={{ fontWeight: 600 }}>{ride.dropoffLocation}</span>
                    </div>
                    <StatusBadge status={ride.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    {new Date(ride.createdAt).toLocaleDateString()}
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
