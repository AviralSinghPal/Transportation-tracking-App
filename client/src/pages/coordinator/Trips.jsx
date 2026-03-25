import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Car, UserPlus, Trash2, MapPin, GripVertical } from 'lucide-react';
import TripCard from '../../components/TripCard';
import LocationPicker from '../../components/LocationPicker';
import './Trips.css';

export default function Trips() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const emptyPassenger = { name: '', phone: '', pickupAddress: '', pickupCoords: null, pickupTime: '', dropoffAddress: '', dropoffCoords: null };
  const [form, setForm] = useState({
    title: '', date: '', type: 'one-time', notes: '',
    driverId: '', vehicleId: '',
    passengers: [{ ...emptyPassenger }]
  });

  useEffect(() => { loadTrips(); }, [dateFilter, filter]);

  async function loadTrips() {
    try {
      let url = `/trips?date=${dateFilter}`;
      if (filter !== 'all') url += `&status=${filter}`;
      const data = await apiFetch(url);
      setTrips(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadFormData() {
    try {
      const [d, v] = await Promise.all([apiFetch('/drivers'), apiFetch('/vehicles')]);
      setDrivers(d);
      setVehicles(v);
    } catch {}
  }

  function updatePassenger(index, field, value) {
    setForm(prev => {
      const passengers = [...prev.passengers];
      passengers[index] = { ...passengers[index], [field]: value };
      return { ...prev, passengers };
    });
  }

  function addPassenger() {
    setForm(prev => ({ ...prev, passengers: [...prev.passengers, { ...emptyPassenger }] }));
  }

  function removePassenger(index) {
    if (form.passengers.length <= 1) return;
    setForm(prev => ({ ...prev, passengers: prev.passengers.filter((_, i) => i !== index) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const passengers = form.passengers.map(p => ({
        name: p.name,
        phone: p.phone,
        pickupAddress: p.pickupAddress,
        pickupLat: p.pickupCoords?.lat,
        pickupLng: p.pickupCoords?.lng,
        pickupTime: new Date(`${form.date}T${p.pickupTime}`),
        dropoffAddress: p.dropoffAddress,
        dropoffLat: p.dropoffCoords?.lat,
        dropoffLng: p.dropoffCoords?.lng,
      }));

      await apiFetch('/trips', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          type: form.type,
          notes: form.notes,
          driver: form.driverId || undefined,
          vehicle: form.vehicleId || undefined,
          passengers
        })
      });
      setShowModal(false);
      resetForm();
      loadTrips();
    } catch (err) {
      alert(err.message);
    }
  }

  function resetForm() {
    setForm({ title: '', date: '', type: 'one-time', notes: '', driverId: '', vehicleId: '', passengers: [{ ...emptyPassenger }] });
  }

  function openCreateModal() {
    resetForm();
    loadFormData();
    setShowModal(true);
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Trips</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> New Trip
        </button>
      </div>

      <div className="trip-filters">
        <input
          type="date"
          className="form-input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ width: 180 }}
        />
        <div className="filter-pills">
          {['all', 'unassigned', 'assigned', 'in-progress', 'completed'].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : trips.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Car size={28} /></div>
          <h3>No trips found</h3>
          <p>Create a new trip to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map(trip => (
            <TripCard key={trip._id} trip={trip} onClick={() => navigate(`/trips/${trip._id}`)} />
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Create New Trip</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label>Trip Title</label>
                  <input className="form-input" placeholder="e.g. Crew to Film Set" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>

                {/* Date + Type */}
                <div className="grid-2">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      <option value="one-time">One-time</option>
                      <option value="full-day">Full Day</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                </div>

                {/* Driver + Vehicle */}
                <div className="grid-2">
                  <div className="form-group">
                    <label>Driver (optional)</label>
                    <select className="form-input" value={form.driverId} onChange={e => setForm({...form, driverId: e.target.value})}>
                      <option value="">Assign later</option>
                      {drivers.filter(d => d.isAvailable).map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vehicle (optional)</label>
                    <select className="form-input" value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})}>
                      <option value="">Assign later</option>
                      {vehicles.filter(v => v.status === 'available').map(v => (
                        <option key={v._id} value={v._id}>{v.name} - {v.licensePlate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Passengers / Route Stops */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <label style={{ fontSize: 14, fontWeight: 700 }}>Route Stops ({form.passengers.length})</label>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addPassenger}>
                      <UserPlus size={14} /> Add Stop
                    </button>
                  </div>

                  {form.passengers.map((p, i) => (
                    <div key={i} style={{
                      padding: 14, marginBottom: 10, borderRadius: 10,
                      border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                      position: 'relative'
                    }}>
                      {/* Stop header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: '#4f46e5', color: 'white', fontSize: 12, fontWeight: 700
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {i === 0 ? 'First Pickup' : `Stop ${i + 1}`}
                          </span>
                        </div>
                        {form.passengers.length > 1 && (
                          <button type="button" onClick={() => removePassenger(i)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-red)', padding: 4
                          }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Passenger name + phone */}
                      <div className="grid-2" style={{ marginBottom: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input className="form-input" placeholder="Passenger name" value={p.name}
                            onChange={e => updatePassenger(i, 'name', e.target.value)} required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input className="form-input" placeholder="Phone (optional)" value={p.phone}
                            onChange={e => updatePassenger(i, 'phone', e.target.value)} />
                        </div>
                      </div>

                      {/* Pickup with map */}
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <LocationPicker
                          label="Pickup"
                          value={p.pickupAddress}
                          coordinates={p.pickupCoords}
                          onChange={(addr, coords) => {
                            updatePassenger(i, 'pickupAddress', addr);
                            updatePassenger(i, 'pickupCoords', coords);
                          }}
                          placeholder="Pickup location"
                          markerColor="#059669"
                          markerLabel="P"
                          compact
                        />
                      </div>

                      {/* Pickup time */}
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Pickup Time</label>
                        <input type="time" className="form-input" value={p.pickupTime}
                          onChange={e => updatePassenger(i, 'pickupTime', e.target.value)} required />
                      </div>

                      {/* Dropoff with map */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <LocationPicker
                          label="Dropoff"
                          value={p.dropoffAddress}
                          coordinates={p.dropoffCoords}
                          onChange={(addr, coords) => {
                            updatePassenger(i, 'dropoffAddress', addr);
                            updatePassenger(i, 'dropoffCoords', coords);
                          }}
                          placeholder="Dropoff location"
                          markerColor="#dc2626"
                          markerLabel="D"
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Notes</label>
                  <input className="form-input" placeholder="Any special instructions?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
