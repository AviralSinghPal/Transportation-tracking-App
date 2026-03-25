import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Bus, Plus, X, Clock, MapPin, Users, Play, Square, CheckCircle2,
  Route, ArrowDown, Trash2, Edit2, ToggleLeft, ToggleRight, RefreshCw, Zap
} from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

const typeLabels = { crew: 'Crew', background: 'Background/Extras', custom: 'Custom' };
const typeColors = { crew: 'var(--color-primary)', background: 'var(--color-yellow)', custom: 'var(--color-green)' };
const runStatusColors = {
  scheduled: 'var(--color-blue)', boarding: 'var(--color-yellow)',
  'in-transit': 'var(--color-green)', completed: 'var(--color-text-tertiary)', cancelled: 'var(--color-red)'
};
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Shuttles() {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();
  const [routes, setRoutes] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('routes');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'crew', frequency: 30, startTime: '06:00', endTime: '22:00',
    capacity: 15, assignedVehicle: '', assignedDriver: '', daysActive: [1, 2, 3, 4, 5],
    stops: [{ name: '', estimatedTime: '', order: 0 }, { name: '', estimatedTime: '', order: 1 }],
    notes: ''
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('shuttle:updated', () => loadData());
    socket.on('shuttle:departing', (data) => {
      // Could show a toast notification here
    });
    return () => {
      socket.off('shuttle:updated');
      socket.off('shuttle:departing');
    };
  }, [socket]);

  async function loadData() {
    try {
      const [r, s, v, d] = await Promise.all([
        apiFetch('/shuttles/routes'),
        apiFetch('/shuttles/schedule'),
        apiFetch('/vehicles'),
        apiFetch('/drivers/available')
      ]);
      setRoutes(r);
      setSchedule(s);
      setVehicles(v.filter(v => v.status === 'available' || v.type === 'van' || v.type === 'minibus'));
      setDrivers(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function addStop() {
    setForm({
      ...form,
      stops: [...form.stops, { name: '', estimatedTime: '', order: form.stops.length }]
    });
  }

  function removeStop(index) {
    if (form.stops.length <= 2) return;
    setForm({
      ...form,
      stops: form.stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    });
  }

  function updateStop(index, field, value) {
    const stops = [...form.stops];
    stops[index] = { ...stops[index], [field]: value };
    setForm({ ...form, stops });
  }

  function toggleDay(day) {
    const days = form.daysActive.includes(day)
      ? form.daysActive.filter(d => d !== day)
      : [...form.daysActive, day].sort();
    setForm({ ...form, daysActive: days });
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await apiFetch('/shuttles/routes', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      setForm({
        name: '', type: 'crew', frequency: 30, startTime: '06:00', endTime: '22:00',
        capacity: 15, assignedVehicle: '', assignedDriver: '', daysActive: [1, 2, 3, 4, 5],
        stops: [{ name: '', estimatedTime: '', order: 0 }, { name: '', estimatedTime: '', order: 1 }],
        notes: ''
      });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function toggleActive(route) {
    try {
      await apiFetch(`/shuttles/routes/${route._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !route.isActive })
      });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function deleteRoute(id) {
    if (!confirm('Delete this shuttle route and all its runs?')) return;
    try {
      await apiFetch(`/shuttles/routes/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function generateRuns(routeId) {
    try {
      const result = await apiFetch(`/shuttles/routes/${routeId}/generate`, { method: 'POST' });
      alert(result.message);
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function updateRunStatus(runId, status) {
    try {
      await apiFetch(`/shuttles/runs/${runId}`, { method: 'PUT', body: JSON.stringify({ status }) });
      loadData();
    } catch (err) { alert(err.message); }
  }

  if (loading) return <SkeletonPage />;

  const activeRoutes = routes.filter(r => r.isActive);

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Routes</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => setTab('routes')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#eef2ff' }}><Route size={20} color="var(--color-primary)" /></div>
          <div className="stat-value">{routes.length}</div>
          <div className="stat-label">Total Routes</div>
        </div>
        <div className="stat-card" onClick={() => setTab('routes')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ecfdf5' }}><Play size={20} color="var(--color-green)" /></div>
          <div className="stat-value">{activeRoutes.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card" onClick={() => setTab('schedule')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fffbeb' }}><Bus size={20} color="var(--color-yellow)" /></div>
          <div className="stat-value">{schedule.filter(r => ['boarding', 'in-transit'].includes(r.status)).length}</div>
          <div className="stat-label">Running Now</div>
        </div>
        <div className="stat-card" onClick={() => setTab('schedule')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f1f5f9' }}><Users size={20} color="var(--color-text-secondary)" /></div>
          <div className="stat-value">{schedule.reduce((s, r) => s + (r.occupancy || 0), 0)}</div>
          <div className="stat-label">Passengers Today</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'routes', label: 'Routes' },
          { key: 'schedule', label: `Today's Schedule (${schedule.length})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--color-primary)' : 'var(--color-gray-light)',
              color: tab === t.key ? 'white' : 'var(--color-text-secondary)'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Routes Tab */}
      {tab === 'routes' && (
        routes.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon"><Bus size={28} /></div>
            <h3>No shuttle routes</h3>
            <p>Create your first shuttle route to start managing shuttles</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {routes.map(route => (
              <div key={route._id} className="card" style={{ padding: 18, opacity: route.isActive ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{route.name}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12,
                        background: `${typeColors[route.type]}18`, color: typeColors[route.type],
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {typeLabels[route.type]}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      Every {route.frequency} min · {route.startTime} – {route.endTime} · {route.capacity} seats
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(route)} title={route.isActive ? 'Deactivate' : 'Activate'}>
                      {route.isActive ? <ToggleRight size={18} color="var(--color-green)" /> : <ToggleLeft size={18} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => generateRuns(route._id)} title="Generate today's runs">
                      <Zap size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => deleteRoute(route._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stops */}
                <div style={{ marginBottom: 12 }}>
                  {route.stops?.sort((a, b) => a.order - b.order).map((stop, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: i === 0 ? 'var(--color-green)' : i === route.stops.length - 1 ? 'var(--color-red)' : 'var(--color-border)',
                        color: (i === 0 || i === route.stops.length - 1) ? 'white' : 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, flexShrink: 0
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{stop.name}</span>
                      {stop.estimatedTime && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>({stop.estimatedTime})</span>
                      )}
                      {i < route.stops.length - 1 && (
                        <ArrowDown size={12} color="var(--color-text-tertiary)" style={{ marginLeft: -4 }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Days Active */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {dayLabels.map((d, i) => (
                    <span key={i} style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: route.daysActive?.includes(i) ? 'var(--color-primary)' : 'var(--color-gray-light)',
                      color: route.daysActive?.includes(i) ? 'white' : 'var(--color-text-tertiary)'
                    }}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* Assigned */}
                {(route.assignedDriver || route.assignedVehicle) && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 16 }}>
                    {route.assignedDriver && <span>Driver: {route.assignedDriver.name}</span>}
                    {route.assignedVehicle && <span>Vehicle: {route.assignedVehicle.name} ({route.assignedVehicle.licensePlate})</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        schedule.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon"><Clock size={28} /></div>
            <h3>No runs scheduled today</h3>
            <p>Generate runs from an active route using the ⚡ button</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedule.map(run => (
              <div key={run._id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${runStatusColors[run.status]}18`, color: runStatusColors[run.status],
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Bus size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{run.route?.name || 'Shuttle'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(run.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {run.driver && ` · ${run.driver.name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{run.occupancy}/{run.capacity}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>passengers</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: `${runStatusColors[run.status]}18`, color: runStatusColors[run.status],
                      textTransform: 'uppercase'
                    }}>
                      {run.status}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                {run.status === 'scheduled' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => updateRunStatus(run._id, 'boarding')}>
                      <Users size={13} /> Start Boarding
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => updateRunStatus(run._id, 'cancelled')}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
                {run.status === 'boarding' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => updateRunStatus(run._id, 'in-transit')}>
                      <Play size={13} /> Depart
                    </button>
                  </div>
                )}
                {run.status === 'in-transit' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => updateRunStatus(run._id, 'completed')}>
                      <CheckCircle2 size={13} /> Complete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Route Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2>Create Shuttle Route</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Route Name</label>
                  <input className="form-input" placeholder="e.g. Base Camp → Set" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Type</label>
                    <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="crew">Crew</option>
                      <option value="background">Background/Extras</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Capacity (seats)</label>
                    <input type="number" className="form-input" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 15 })} />
                  </div>
                </div>

                {/* Stops */}
                <div className="form-group">
                  <label>Stops</label>
                  {form.stops.map((stop, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: i === 0 ? 'var(--color-green)' : i === form.stops.length - 1 ? 'var(--color-red)' : 'var(--color-border)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0
                      }}>
                        {i + 1}
                      </div>
                      <input
                        className="form-input"
                        placeholder={i === 0 ? 'First stop (e.g. Crew Parking)' : 'Stop name'}
                        value={stop.name}
                        onChange={e => updateStop(i, 'name', e.target.value)}
                        style={{ flex: 1 }}
                        required
                      />
                      <input
                        type="time"
                        className="form-input"
                        value={stop.estimatedTime}
                        onChange={e => updateStop(i, 'estimatedTime', e.target.value)}
                        style={{ width: 120 }}
                      />
                      {form.stops.length > 2 && (
                        <button type="button" className="btn-icon" onClick={() => removeStop(i)} style={{ color: 'var(--color-red)' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addStop}>
                    <Plus size={14} /> Add Stop
                  </button>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" className="form-input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" className="form-input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Every (min)</label>
                    <input type="number" className="form-input" min="5" max="120" value={form.frequency} onChange={e => setForm({ ...form, frequency: parseInt(e.target.value) || 30 })} />
                  </div>
                </div>

                {/* Days Active */}
                <div className="form-group">
                  <label>Active Days</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {dayLabels.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600,
                          background: form.daysActive.includes(i) ? 'var(--color-primary)' : 'var(--color-gray-light)',
                          color: form.daysActive.includes(i) ? 'white' : 'var(--color-text-secondary)'
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Assigned Driver</label>
                    <select className="form-input" value={form.assignedDriver} onChange={e => setForm({ ...form, assignedDriver: e.target.value })}>
                      <option value="">Select driver...</option>
                      {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned Vehicle</label>
                    <select className="form-input" value={form.assignedVehicle} onChange={e => setForm({ ...form, assignedVehicle: e.target.value })}>
                      <option value="">Select vehicle...</option>
                      {vehicles.map(v => <option key={v._id} value={v._id}>{v.name} ({v.capacity} seats)</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Route</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
