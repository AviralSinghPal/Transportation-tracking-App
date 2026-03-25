import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, RotateCcw, Calendar, Plus, Trash2 } from 'lucide-react';

export default function RepeatScheduleModal({ onClose, onCreated }) {
  const { apiFetch } = useAuth();
  const [date, setDate] = useState('');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  async function fetchRides(dateStr) {
    setLoading(true);
    try {
      const data = await apiFetch(`/ride-requests/history?date=${dateStr}`);
      if (data && data.length > 0) {
        setRides(data.map(r => ({
          requesterName: r.requester?.name || '',
          pickupLocation: r.pickupLocation || '',
          dropoffLocation: r.dropoffLocation || '',
          pickupTime: r.pickupTime ? new Date(r.pickupTime).toTimeString().slice(0, 5) : '',
          driverId: r.assignedDriver?._id || '',
          driverName: r.assignedDriver?.name || '',
          vehicleId: r.assignedVehicle?._id || '',
          vehicleName: r.assignedVehicle?.name || '',
          passengerCount: r.passengerCount || 1,
          department: r.department || 'other',
          priority: r.priority || 'normal',
          notes: r.notes || ''
        })));
      } else {
        setRides([]);
        alert('No rides found for that date.');
      }
    } catch (err) {
      alert('Could not load rides for that date.');
    } finally {
      setLoading(false);
    }
  }

  function updateRide(index, field, value) {
    setRides(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function removeRide(index) {
    setRides(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreateAll() {
    if (rides.length === 0) return;
    setSubmitting(true);
    try {
      const payload = rides.map(r => ({
        pickupLocation: r.pickupLocation,
        dropoffLocation: r.dropoffLocation,
        pickupTime: r.pickupTime,
        passengerCount: r.passengerCount,
        department: r.department,
        priority: r.priority,
        notes: r.notes,
        driverId: r.driverId || undefined,
        vehicleId: r.vehicleId || undefined
      }));
      await apiFetch('/ride-requests/bulk', {
        method: 'POST',
        body: JSON.stringify({ requests: payload })
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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>Repeat Schedule</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchRides(getYesterdayStr())}
              disabled={loading}
            >
              <RotateCcw size={14} /> Same as Yesterday
            </button>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>or</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="var(--color-text-secondary)" />
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: 160 }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => date && fetchRides(date)}
                disabled={!date || loading}
              >
                Load
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-secondary)' }}>
              Loading rides...
            </div>
          )}

          {/* Rides list */}
          {!loading && rides.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {rides.map((ride, i) => (
                <div key={i} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {ride.requesterName || `Ride ${i + 1}`}
                    </span>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeRide(i)}
                      style={{ color: 'var(--color-red)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Pickup"
                      value={ride.pickupLocation}
                      onChange={e => updateRide(i, 'pickupLocation', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Dropoff"
                      value={ride.dropoffLocation}
                      onChange={e => updateRide(i, 'dropoffLocation', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={ride.pickupTime}
                      onChange={e => updateRide(i, 'pickupTime', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Driver"
                      value={ride.driverName}
                      onChange={e => updateRide(i, 'driverName', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Vehicle"
                      value={ride.vehicleName}
                      onChange={e => updateRide(i, 'vehicleName', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && rides.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              Select a date to load previous ride requests
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateAll}
            disabled={rides.length === 0 || submitting}
          >
            {submitting ? 'Creating...' : `Create All (${rides.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
