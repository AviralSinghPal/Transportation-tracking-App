import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wrench, Plus, X, Calendar, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonPage } from '../../components/Skeleton';

const typeLabels = {
  'oil-change': 'Oil Change', 'tire-rotation': 'Tire Rotation', 'brake-check': 'Brake Check',
  'inspection': 'Inspection', 'repair': 'Repair', 'cleaning': 'Cleaning', 'other': 'Other'
};

export default function MaintenancePage() {
  const { apiFetch } = useAuth();
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehicle: '', type: 'oil-change', title: '', description: '', scheduledDate: '', cost: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [r, v, a] = await Promise.all([
        apiFetch('/maintenance'),
        apiFetch('/vehicles'),
        apiFetch('/maintenance/alerts')
      ]);
      setRecords(r);
      setVehicles(v);
      setAlerts(a);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await apiFetch('/maintenance', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ vehicle: '', type: 'oil-change', title: '', description: '', scheduledDate: '', cost: 0 });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function markComplete(id) {
    try {
      await apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'completed', completedDate: new Date() }) });
      loadData();
    } catch (err) { alert(err.message); }
  }

  if (loading) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Maintenance</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Schedule</button>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--color-yellow)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="var(--color-yellow)" />
            <strong style={{ fontSize: 14 }}>{alerts.length} Upcoming/Overdue Maintenance</strong>
          </div>
          {alerts.map(a => (
            <div key={a._id} style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 26, marginTop: 4 }}>
              {a.vehicle?.name} - {a.title} ({new Date(a.scheduledDate).toLocaleDateString()})
            </div>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Wrench size={28} /></div>
          <h3>No maintenance records</h3>
          <p>Schedule your first maintenance task</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {records.map(r => (
            <div key={r._id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {r.vehicle?.name} - {typeLabels[r.type]}
                  </div>
                </div>
                <span className={`badge badge-${r.status === 'completed' ? 'green' : r.status === 'overdue' ? 'red' : 'yellow'}`}>
                  <span className="badge-dot" />{r.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {new Date(r.scheduledDate).toLocaleDateString()}</span>
                {r.cost > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} /> ${r.cost}</span>}
              </div>
              {r.status !== 'completed' && (
                <button className="btn btn-success btn-sm" style={{ marginTop: 10 }} onClick={() => markComplete(r._id)}>
                  <CheckCircle2 size={13} /> Mark Complete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Maintenance</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vehicle</label>
                  <select className="form-input" value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.name} ({v.licensePlate})</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Type</label>
                    <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled Date</label>
                    <input type="date" className="form-input" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" placeholder="e.g. Oil change for Van #1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estimated Cost ($)</label>
                    <input type="number" className="form-input" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input className="form-input" placeholder="Additional details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
