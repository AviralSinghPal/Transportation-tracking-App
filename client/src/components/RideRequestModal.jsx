import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, MapPin, Clock, Users, MessageSquare, RotateCcw } from 'lucide-react';
import LocationPicker from './LocationPicker';

const departments = [
  { value: 'production', label: 'Production' },
  { value: 'ad-department', label: 'AD Department' },
  { value: 'camera', label: 'Camera' },
  { value: 'art', label: 'Art Department' },
  { value: 'hair-makeup', label: 'Hair & Makeup' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'sound', label: 'Sound' },
  { value: 'electric', label: 'Electric' },
  { value: 'grip', label: 'Grip' },
  { value: 'locations', label: 'Locations' },
  { value: 'talent', label: 'Talent' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'urgent', label: 'Urgent', color: 'var(--color-red)' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'normal', label: 'Normal', color: 'var(--color-primary)' },
  { value: 'low', label: 'Low', color: 'var(--color-text-tertiary)' }
];

const quickLocations = ['Base Camp', 'Set', 'Crew Parking', 'Hair/Makeup Trailer', 'Wardrobe Trailer', 'Catering', 'Hotel', 'Airport', 'Stage'];

export default function RideRequestModal({ onClose, onCreated }) {
  const { apiFetch } = useAuth();
  const [form, setForm] = useState({
    pickupLocation: '',
    pickupCoordinates: null,
    dropoffLocation: '',
    dropoffCoordinates: null,
    pickupTime: '',
    passengerCount: 1,
    priority: 'normal',
    department: 'other',
    notes: ''
  });
  const [asap, setAsap] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingYesterday, setLoadingYesterday] = useState(false);

  async function handleSameAsYesterday() {
    setLoadingYesterday(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const data = await apiFetch(`/ride-requests/history?date=${dateStr}`);
      if (data && data.length > 0) {
        const ride = data[0];
        setForm(f => ({
          ...f,
          pickupLocation: ride.pickupLocation || f.pickupLocation,
          dropoffLocation: ride.dropoffLocation || f.dropoffLocation
        }));
      } else {
        alert('No rides found from yesterday.');
      }
    } catch (err) {
      alert('Could not load yesterday\'s rides.');
    } finally {
      setLoadingYesterday(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.pickupLocation.trim() || !form.dropoffLocation.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch('/ride-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          pickupTime: asap ? new Date().toISOString() : form.pickupTime
        })
      });
      onCreated?.();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Request a Ride</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Priority */}
            <div className="form-group">
              <label>Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {priorities.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p.value })}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${form.priority === p.value ? p.color : 'var(--color-border)'}`,
                      background: form.priority === p.value ? `${p.color}14` : 'transparent',
                      color: form.priority === p.value ? p.color : 'var(--color-text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center'
                    }}
                  >
                    <div>{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="form-group">
              <LocationPicker
                label="Pickup Location"
                value={form.pickupLocation}
                coordinates={form.pickupCoordinates}
                onChange={(address, coords) => setForm({ ...form, pickupLocation: address, pickupCoordinates: coords })}
                placeholder="Where to pick up?"
                markerColor="#059669"
                markerLabel="P"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {quickLocations.slice(0, 5).map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setForm({ ...form, pickupLocation: loc, pickupCoordinates: null })}
                    style={{
                      padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-border)',
                      background: form.pickupLocation === loc ? 'var(--color-primary)' : 'transparent',
                      color: form.pickupLocation === loc ? 'white' : 'var(--color-text-secondary)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="form-group">
              <LocationPicker
                label="Dropoff Location"
                value={form.dropoffLocation}
                coordinates={form.dropoffCoordinates}
                onChange={(address, coords) => setForm({ ...form, dropoffLocation: address, dropoffCoordinates: coords })}
                placeholder="Where to go?"
                markerColor="#dc2626"
                markerLabel="D"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {quickLocations.slice(0, 5).map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setForm({ ...form, dropoffLocation: loc, dropoffCoordinates: null })}
                    style={{
                      padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-border)',
                      background: form.dropoffLocation === loc ? 'var(--color-primary)' : 'transparent',
                      color: form.dropoffLocation === loc ? 'white' : 'var(--color-text-secondary)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="form-group">
              <label><Clock size={12} style={{ marginRight: 4 }} />When</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setAsap(true)}
                  className={`btn ${asap ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  Pick Up Now
                </button>
                <button
                  type="button"
                  onClick={() => setAsap(false)}
                  className={`btn ${!asap ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  Schedule Time
                </button>
                {!asap && (
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={form.pickupTime}
                    onChange={e => setForm({ ...form, pickupTime: e.target.value })}
                    style={{ flex: 1 }}
                    required={!asap}
                  />
                )}
              </div>
            </div>

            <div className="grid-2">
              {/* Passengers */}
              <div className="form-group">
                <label><Users size={12} style={{ marginRight: 4 }} />Passengers</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="50"
                  value={form.passengerCount}
                  onChange={e => setForm({ ...form, passengerCount: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* Department */}
              <div className="form-group">
                <label>Department</label>
                <select
                  className="form-input"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                >
                  {departments.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label><MessageSquare size={12} style={{ marginRight: 4 }} />Notes (optional)</label>
              <input
                className="form-input"
                placeholder="Special instructions..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* Same as Yesterday */}
            <div className="form-group">
              <button
                type="button"
                onClick={handleSameAsYesterday}
                disabled={loadingYesterday}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', width: '100%', justifyContent: 'center'
                }}
              >
                <RotateCcw size={14} />
                {loadingYesterday ? 'Loading...' : 'Same as yesterday'}
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Requesting...' : 'Request Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
