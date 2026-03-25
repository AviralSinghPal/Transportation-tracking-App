import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Car, Truck as TruckIcon, Bus, X, Wrench, CheckCircle2, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import './Fleet.css';

const vehicleIcons = { car: Car, van: TruckIcon, suv: Car, minibus: Bus, shuttle: Bus };

export default function Fleet() {
  const { apiFetch } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'car', licensePlate: '', capacity: 4, notes: '' });

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      const data = await apiFetch('/vehicles');
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ name: '', type: 'car', licensePlate: '', capacity: 4, notes: '' });
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleStatus(vehicle, newStatus) {
    try {
      await apiFetch(`/vehicles/${vehicle._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this vehicle?')) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Fleet</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="fleet-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <TruckIcon size={20} />
          </div>
          <div className="stat-value">{vehicles.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-green)' }}>{vehicles.filter(v => v.status === 'available').length}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-yellow-light)', color: 'var(--color-yellow)' }}>
            <Car size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-yellow)' }}>{vehicles.filter(v => v.status === 'in-use').length}</div>
          <div className="stat-label">In Use</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>
            <Wrench size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-red)' }}>{vehicles.filter(v => v.status === 'maintenance').length}</div>
          <div className="stat-label">Maintenance</div>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><TruckIcon size={28} /></div>
          <h3>No vehicles yet</h3>
          <p>Add your first vehicle to get started</p>
        </div>
      ) : (
        <div className="grid-3">
          {vehicles.map(v => {
            const Icon = vehicleIcons[v.type] || Car;
            return (
              <div key={v._id} className="card vehicle-card">
                <div className="vehicle-card-header">
                  <div className="vehicle-icon-wrap">
                    <Icon size={22} />
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <h3 className="vehicle-name">{v.name}</h3>
                <div className="vehicle-meta">
                  <span>{v.licensePlate}</span>
                  <span className="vehicle-meta-dot" />
                  <span>{v.capacity} seats</span>
                  <span className="vehicle-meta-dot" />
                  <span style={{ textTransform: 'capitalize' }}>{v.type}</span>
                </div>
                {v.notes && <p className="vehicle-notes">{v.notes}</p>}
                <div className="vehicle-actions">
                  {v.status !== 'available' && (
                    <button className="btn btn-success btn-sm" onClick={() => toggleStatus(v, 'available')}>
                      <CheckCircle2 size={13} /> Available
                    </button>
                  )}
                  {v.status !== 'maintenance' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleStatus(v, 'maintenance')}>
                      <Wrench size={13} /> Maintenance
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v._id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Vehicle</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input className="form-input" placeholder="e.g. Van #3" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Type</label>
                    <select className="form-input" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                      <option value="suv">SUV</option>
                      <option value="minibus">Minibus</option>
                      <option value="shuttle">Shuttle Bus</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Capacity</label>
                    <input type="number" className="form-input" min="1" value={form.capacity} onChange={(e) => setForm({...form, capacity: parseInt(e.target.value)})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>License Plate</label>
                  <input className="form-input" placeholder="e.g. ABC-1234" value={form.licensePlate} onChange={(e) => setForm({...form, licensePlate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input className="form-input" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
