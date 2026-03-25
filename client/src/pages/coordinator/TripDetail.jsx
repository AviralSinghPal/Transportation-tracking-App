import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, User, Car, MapPin, Clock, Flag, FileText, X, UserPlus, AlertTriangle, Copy, DollarSign } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import './TripDetail.css';

export default function TripDetail() {
  const { id } = useParams();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  useEffect(() => { loadTrip(); }, [id]);

  async function loadTrip() {
    try {
      const data = await apiFetch(`/trips/${id}`);
      setTrip(data.trip);
      setEvents(data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openAssign() {
    const [d, v] = await Promise.all([
      apiFetch('/drivers/available'),
      apiFetch('/vehicles?status=available')
    ]);
    setDrivers(d);
    setVehicles(v);
    setShowAssign(true);
  }

  async function handleAssign(e) {
    e.preventDefault();
    try {
      await apiFetch(`/trips/${id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: selectedDriver, vehicleId: selectedVehicle })
      });
      setShowAssign(false);
      loadTrip();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveTemplate() {
    const name = prompt('Template name:', trip.title);
    if (!name) return;
    try {
      await apiFetch(`/templates/from-trip/${id}`, { method: 'POST', body: JSON.stringify({ name }) });
      alert('Template saved!');
    } catch (err) { alert(err.message); }
  }

  async function handleCancel() {
    if (!confirm('Cancel this trip?')) return;
    try {
      await apiFetch(`/trips/${id}`, { method: 'DELETE' });
      navigate('/trips');
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!trip) return <div className="page">Trip not found</div>;

  return (
    <div className="page">
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/trips')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to Trips
      </button>

      <div className="trip-detail-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{trip.title}</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, fontSize: 14 }}>
            {new Date(trip.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>Assignment</h3>
            {trip.driver ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <User size={16} color="var(--color-text-tertiary)" />
                  <strong>{trip.driver.name}</strong>
                  {trip.driver.phone && <span style={{ color: 'var(--color-text-secondary)' }}>{trip.driver.phone}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <Car size={16} color="var(--color-text-tertiary)" />
                  <strong>{trip.vehicle?.name}</strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{trip.vehicle?.licensePlate}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No driver assigned yet</p>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={openAssign}>
                <UserPlus size={14} />
                {trip.driver ? 'Reassign' : 'Assign Driver'}
              </button>
              {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>Cancel Trip</button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={handleSaveTemplate}>
                <Copy size={14} /> Save as Template
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>
              Passengers ({trip.passengers.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {trip.passengers.map((p, i) => (
                <div key={p._id || i} className="passenger-item">
                  <div className="passenger-header">
                    <strong>{p.name || p.user?.name}</strong>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="passenger-stops">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <MapPin size={13} color="var(--color-text-tertiary)" /> {p.pickupAddress}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Clock size={13} color="var(--color-text-tertiary)" /> {new Date(p.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Flag size={13} color="var(--color-text-tertiary)" /> {p.dropoffAddress}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {trip.notes && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="section-title" style={{ marginBottom: 8 }}>
                <FileText size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                Notes
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{trip.notes}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 16 }}>Timeline</h3>
          {events.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No events recorded yet</p>
          ) : (
            <div className="timeline">
              {events.map((event, i) => (
                <div key={event._id} className="timeline-item">
                  <div className="timeline-dot" />
                  {i < events.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-content">
                    <div className="timeline-event">{event.details || event.type}</div>
                    <div className="timeline-time">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {event.actor && ` \u00B7 ${event.actor.name}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Driver & Vehicle</h2>
              <button className="btn-icon" onClick={() => setShowAssign(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Driver</label>
                  <select className="form-input" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} required>
                    <option value="">Select a driver...</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name} {d.phone && `(${d.phone})`}</option>
                    ))}
                  </select>
                  {drivers.length === 0 && (
                    <p style={{ color: 'var(--color-red)', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={13} /> No available drivers
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Vehicle</label>
                  <select className="form-input" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
                    <option value="">Select a vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.name} \u00B7 {v.type} \u00B7 {v.capacity} seats</option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p style={{ color: 'var(--color-red)', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={13} /> No available vehicles
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
