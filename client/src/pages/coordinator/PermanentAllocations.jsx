import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, X, MapPin, Clock, Users, Phone, Car, Truck,
  Edit2, Trash2, Play, Pause, ArrowRightLeft, ChevronDown,
  ChevronUp, UserCheck, Calendar, FileText, Shield, Sun,
  History, AlertCircle
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LocationPicker from '../../components/LocationPicker';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

const emptyForm = {
  title: '',
  pickupLocation: '',
  pickupCoordinates: null,
  dropoffLocation: '',
  dropoffCoordinates: null,
  scheduledTime: '',
  driverId: '',
  vehicleId: '',
  passengers: [],
  startDate: '',
  endDate: '',
  activeDays: [1, 2, 3, 4, 5],
  isFullDayTrip: false,
  isSelfManaged: false,
  notes: '',
  status: 'draft'
};

const emptyPassenger = {
  name: '',
  pickupName: '',
  contactNumber: '',
  isPrivate: false,
  pickupLocation: '',
  pickupCoordinates: null,
  dropoffLocation: '',
  dropoffCoordinates: null
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNamesFull = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatActiveDays(days) {
  if (!days || days.length === 0) return 'None';
  // Handle both number format [0-6] and string format ['monday',...]
  const normalized = days.map(d => typeof d === 'number' ? d : dayNamesFull.indexOf(String(d).toLowerCase()));
  if (normalized.length === 7) return 'Every day';
  const isWeekdays = [1,2,3,4,5].every(d => normalized.includes(d)) && ![0,6].some(d => normalized.includes(d));
  if (isWeekdays) return 'Mon - Fri';
  const isWeekend = [0,6].every(d => normalized.includes(d)) && ![1,2,3,4,5].some(d => normalized.includes(d));
  if (isWeekend) return 'Sat - Sun';
  return normalized.sort().map(d => dayNames[d] || '?').join(', ');
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function PermanentAllocations() {
  const { apiFetch } = useAuth();
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [showSwapDriverModal, setShowSwapDriverModal] = useState(null);
  const [swapDriverForm, setSwapDriverForm] = useState({ newDriverId: '', reason: '' });

  const [showSwapVehicleModal, setShowSwapVehicleModal] = useState(null);
  const [swapVehicleForm, setSwapVehicleForm] = useState({ newVehicleId: '', reason: '' });

  // Expanded swap history
  const [expandedHistory, setExpandedHistory] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [t, d, v] = await Promise.all([
        apiFetch('/permanent-trips'),
        apiFetch('/drivers'),
        apiFetch('/vehicles')
      ]);
      setTrips(t);
      setDrivers(d);
      setVehicles(v);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Stats
  const activeCount = trips.filter(t => t.status === 'active').length;
  const draftCount = trips.filter(t => t.status === 'draft').length;
  const pausedCount = trips.filter(t => t.status === 'paused').length;
  const assignedDrivers = new Set(trips.filter(t => t.driverId).map(t => typeof t.driverId === 'object' ? t.driverId._id : t.driverId)).size;

  // Filtered trips
  const filtered = tab === 'all' ? trips : trips.filter(t => t.status === tab);

  // Helpers
  function getDriver(trip) {
    if (!trip.driverId) return null;
    if (typeof trip.driverId === 'object') return trip.driverId;
    return drivers.find(d => d._id === trip.driverId) || null;
  }

  function getVehicle(trip) {
    if (!trip.vehicleId) return null;
    if (typeof trip.vehicleId === 'object') return trip.vehicleId;
    return vehicles.find(v => v._id === trip.vehicleId) || null;
  }

  // CRUD
  function openCreate() {
    setEditingTrip(null);
    setForm({ ...emptyForm, passengers: [] });
    setShowFormModal(true);
  }

  function openEdit(trip) {
    setEditingTrip(trip);
    setForm({
      title: trip.title || '',
      pickupLocation: trip.pickupLocation || '',
      pickupCoordinates: trip.pickupCoordinates || null,
      dropoffLocation: trip.dropoffLocation || '',
      dropoffCoordinates: trip.dropoffCoordinates || null,
      scheduledTime: trip.scheduledTime || '',
      driverId: (typeof trip.driver === 'object' ? trip.driver?._id : trip.driver) || '',
      vehicleId: (typeof trip.vehicle === 'object' ? trip.vehicle?._id : trip.vehicle) || '',
      passengers: trip.passengers?.length ? trip.passengers.map(p => ({ ...emptyPassenger, ...p })) : [],
      startDate: trip.startDate ? trip.startDate.split('T')[0] : '',
      endDate: trip.endDate ? trip.endDate.split('T')[0] : '',
      activeDays: trip.activeDays || [1, 2, 3, 4, 5],
      isFullDayTrip: trip.isFullDayTrip || false,
      isSelfManaged: trip.isSelfManaged || false,
      notes: trip.notes || '',
      status: trip.status || 'draft'
    });
    setShowFormModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.endDate) delete payload.endDate;
      if (!payload.driverId) delete payload.driverId;
      if (!payload.vehicleId) delete payload.vehicleId;

      if (editingTrip) {
        await apiFetch(`/permanent-trips/${editingTrip._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        // Update passengers separately
        if (form.passengers.length > 0 || editingTrip.passengers?.length > 0) {
          await apiFetch(`/permanent-trips/${editingTrip._id}/passengers`, {
            method: 'PUT',
            body: JSON.stringify({ passengers: form.passengers })
          });
        }
      } else {
        await apiFetch('/permanent-trips', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setShowFormModal(false);
      setEditingTrip(null);
      setForm({ ...emptyForm });
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(trip) {
    if (!confirm(`Delete "${trip.title}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/permanent-trips/${trip._id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleActivate(trip) {
    try {
      await apiFetch(`/permanent-trips/${trip._id}/activate`, { method: 'PUT' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handlePause(trip) {
    try {
      await apiFetch(`/permanent-trips/${trip._id}/pause`, { method: 'PUT' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Swap Driver
  function openSwapDriver(trip) {
    setShowSwapDriverModal(trip);
    setSwapDriverForm({ newDriverId: '', reason: '' });
  }

  async function handleSwapDriver(e) {
    e.preventDefault();
    try {
      await apiFetch(`/permanent-trips/${showSwapDriverModal._id}/swap-driver`, {
        method: 'PUT',
        body: JSON.stringify(swapDriverForm)
      });
      setShowSwapDriverModal(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Swap Vehicle
  function openSwapVehicle(trip) {
    setShowSwapVehicleModal(trip);
    setSwapVehicleForm({ newVehicleId: '', reason: '' });
  }

  async function handleSwapVehicle(e) {
    e.preventDefault();
    try {
      await apiFetch(`/permanent-trips/${showSwapVehicleModal._id}/swap-vehicle`, {
        method: 'PUT',
        body: JSON.stringify(swapVehicleForm)
      });
      setShowSwapVehicleModal(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Passengers
  function addPassenger() {
    setForm({ ...form, passengers: [...form.passengers, { ...emptyPassenger }] });
  }

  function updatePassenger(index, field, value) {
    const updated = [...form.passengers];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, passengers: updated });
  }

  function removePassenger(index) {
    setForm({ ...form, passengers: form.passengers.filter((_, i) => i !== index) });
  }

  function toggleDay(day) {
    const days = form.activeDays.includes(day)
      ? form.activeDays.filter(d => d !== day)
      : [...form.activeDays, day];
    setForm({ ...form, activeDays: days });
  }

  function toggleHistory(tripId) {
    setExpandedHistory(prev => ({ ...prev, [tripId]: !prev[tripId] }));
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Permanent Allocations</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> New Allocation
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => setTab('active')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
            <Play size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-green)' }}>{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card" onClick={() => setTab('draft')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f1f5f9', color: 'var(--color-gray)' }}>
            <FileText size={20} />
          </div>
          <div className="stat-value">{draftCount}</div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card" onClick={() => setTab('paused')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'var(--color-yellow-light)', color: 'var(--color-yellow)' }}>
            <Pause size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-yellow)' }}>{pausedCount}</div>
          <div className="stat-label">Paused</div>
        </div>
        <div className="stat-card" onClick={() => setTab('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <UserCheck size={20} />
          </div>
          <div className="stat-value">{assignedDrivers}</div>
          <div className="stat-label">Drivers Assigned</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-gray-light)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[
          { id: 'all', label: 'All', count: trips.length },
          { id: 'active', label: 'Active', count: activeCount },
          { id: 'draft', label: 'Drafts', count: draftCount },
          { id: 'paused', label: 'Paused', count: pausedCount }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? 'var(--color-text)' : 'var(--color-text-secondary)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Card List */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Calendar size={28} /></div>
          <h3>No {tab === 'all' ? '' : tab} allocations</h3>
          <p>{tab === 'all' ? 'Create your first permanent allocation to get started' : `No ${tab} allocations found`}</p>
          {tab === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>
              <Plus size={16} /> New Allocation
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map(trip => {
            const driver = getDriver(trip);
            const vehicle = getVehicle(trip);
            const statusColor = trip.status === 'active' ? '#16a34a' : trip.status === 'paused' ? '#d97706' : '#6b7280';
            const swapHistory = trip.swapHistory || [];
            const isHistoryOpen = expandedHistory[trip._id];

            return (
              <div key={trip._id} className="card" style={{ borderLeft: `4px solid ${statusColor}` }}>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{trip.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      <MapPin size={13} />
                      <span>{trip.pickupLocation}</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>&rarr;</span>
                      <span>{trip.dropoffLocation}</span>
                    </div>
                    {trip.scheduledTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        <Clock size={12} />
                        {formatTime(trip.scheduledTime)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge status={trip.status === 'active' ? 'available' : trip.status === 'paused' ? 'in-use' : 'off-duty'} />
                  </div>
                </div>

                {/* Driver & Vehicle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-gray-light)', borderRadius: 8, fontSize: 13 }}>
                    <UserCheck size={15} color="var(--color-text-tertiary)" />
                    {driver ? (
                      <>
                        <span style={{ fontWeight: 600 }}>{driver.name}</span>
                        {driver.phone && (
                          <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> {driver.phone}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-gray-light)', borderRadius: 8, fontSize: 13 }}>
                    <Car size={15} color="var(--color-text-tertiary)" />
                    {vehicle ? (
                      <>
                        <span style={{ fontWeight: 600 }}>{vehicle.name}</span>
                        <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{vehicle.type}</span>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{vehicle.licensePlate}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>No vehicle</span>
                    )}
                  </div>
                </div>

                {/* Meta Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                    <Users size={12} /> {trip.passengers?.length || 0} passengers
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                    <Calendar size={12} />
                    {formatDate(trip.startDate) || 'No start'} &ndash; {formatDate(trip.endDate) || 'Indefinite'}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {formatActiveDays(trip.activeDays)}
                  </span>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {trip.isFullDayTrip && (
                    <span className="badge badge-blue">
                      <Sun size={11} /> Full Day Trip
                    </span>
                  )}
                  {trip.isSelfManaged && (
                    <span className="badge badge-yellow">
                      <Shield size={11} /> Self Managed
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(trip)}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => openSwapDriver(trip)}>
                    <ArrowRightLeft size={13} /> Swap Driver
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => openSwapVehicle(trip)}>
                    <Truck size={13} /> Swap Vehicle
                  </button>
                  {trip.status === 'draft' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleActivate(trip)}>
                      <Play size={13} /> Activate
                    </button>
                  )}
                  {trip.status === 'active' && (
                    <button className="btn btn-sm" onClick={() => handlePause(trip)} style={{ color: '#d97706', background: 'rgba(217,119,6,0.08)' }}>
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {trip.status === 'paused' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleActivate(trip)}>
                      <Play size={13} /> Resume
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => handleDelete(trip)} style={{ color: 'var(--color-red)', background: 'rgba(220,38,38,0.08)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Swap History */}
                {swapHistory.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                    <button
                      onClick={() => toggleHistory(trip._id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <History size={13} />
                      Swap History ({swapHistory.length})
                      {isHistoryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {isHistoryOpen && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {swapHistory.map((entry, i) => (
                          <div key={i} style={{ padding: '6px 10px', background: 'var(--color-gray-light)', borderRadius: 6, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ fontWeight: 600 }}>
                                {entry.type === 'driver' ? 'Driver Swap' : 'Vehicle Swap'}
                              </span>
                              <span style={{ color: 'var(--color-text-tertiary)' }}>
                                {formatDate(entry.date || entry.swappedAt || entry.createdAt)}
                              </span>
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                              {entry.fromName || entry.from || 'Unknown'} &rarr; {entry.toName || entry.to || 'Unknown'}
                            </div>
                            {entry.reason && (
                              <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2, fontStyle: 'italic' }}>
                                {entry.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => { setShowFormModal(false); setEditingTrip(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editingTrip ? 'Edit Allocation' : 'New Permanent Allocation'}</h2>
              <button className="btn-icon" onClick={() => { setShowFormModal(false); setEditingTrip(null); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" placeholder="e.g. Morning Office Run" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>

                {/* Locations */}
                <div className="form-group">
                  <LocationPicker
                    label="Pickup Location"
                    value={form.pickupLocation}
                    coordinates={form.pickupCoordinates}
                    onChange={(address, coords) => setForm({ ...form, pickupLocation: address, pickupCoordinates: coords })}
                    placeholder="From..."
                    markerColor="#059669"
                    markerLabel="P"
                  />
                </div>
                <div className="form-group">
                  <LocationPicker
                    label="Dropoff Location"
                    value={form.dropoffLocation}
                    coordinates={form.dropoffCoordinates}
                    onChange={(address, coords) => setForm({ ...form, dropoffLocation: address, dropoffCoordinates: coords })}
                    placeholder="To..."
                    markerColor="#dc2626"
                    markerLabel="D"
                  />
                </div>

                {/* Time */}
                <div className="form-group">
                  <label>Scheduled Time</label>
                  <input type="time" className="form-input" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} required />
                </div>

                {/* Driver & Vehicle */}
                <div className="grid-2">
                  <div className="form-group">
                    <label>Driver</label>
                    <select className="form-input" value={form.driverId} onChange={e => setForm({ ...form, driverId: e.target.value })}>
                      <option value="">Unassigned</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.name}{d.isTripAssigned ? ' [Already Assigned]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vehicle</label>
                    <select className="form-input" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                      <option value="">No vehicle</option>
                      {vehicles.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.type}) - {v.licensePlate}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid-2">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>End Date (optional)</label>
                    <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>

                {/* Active Days */}
                <div className="form-group">
                  <label>Active Days</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAY_VALUES.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          border: `2px solid ${form.activeDays.includes(day) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: form.activeDays.includes(day) ? 'rgba(79,70,229,0.08)' : 'transparent',
                          color: form.activeDays.includes(day) ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                        }}
                      >
                        {DAY_LABELS[i]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={form.isFullDayTrip}
                      onChange={e => setForm({ ...form, isFullDayTrip: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                    />
                    <Sun size={16} /> Full Day Trip
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={form.isSelfManaged}
                      onChange={e => setForm({ ...form, isSelfManaged: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                    />
                    <Shield size={16} /> Self Managed
                  </label>
                </div>

                {/* Passengers */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ margin: 0 }}>Passengers</label>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addPassenger}>
                      <Plus size={13} /> Add Passenger
                    </button>
                  </div>
                  {form.passengers.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, background: 'var(--color-gray-light)', borderRadius: 8 }}>
                      No passengers added yet
                    </div>
                  )}
                  {form.passengers.map((p, idx) => (
                    <div key={idx} style={{ padding: 12, background: 'var(--color-gray-light)', borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>Passenger {idx + 1}</span>
                        <button type="button" className="btn-icon" onClick={() => removePassenger(idx)} style={{ color: 'var(--color-red)' }}>
                          <X size={15} />
                        </button>
                      </div>
                      <div className="grid-2" style={{ gap: 8 }}>
                        <input className="form-input" placeholder="Name" value={p.name} onChange={e => updatePassenger(idx, 'name', e.target.value)} style={{ fontSize: 13 }} />
                        <input className="form-input" placeholder="Pickup Name" value={p.pickupName} onChange={e => updatePassenger(idx, 'pickupName', e.target.value)} style={{ fontSize: 13 }} />
                      </div>
                      <div className="grid-2" style={{ gap: 8, marginTop: 8 }}>
                        <input className="form-input" placeholder="Contact Number" value={p.contactNumber} onChange={e => updatePassenger(idx, 'contactNumber', e.target.value)} style={{ fontSize: 13 }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                          <input type="checkbox" checked={p.isPrivate} onChange={e => updatePassenger(idx, 'isPrivate', e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                          Private
                        </label>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <LocationPicker
                          label="Passenger Pickup"
                          value={p.pickupLocation || ''}
                          coordinates={p.pickupCoordinates}
                          onChange={(address, coords) => {
                            const updated = [...form.passengers];
                            updated[idx] = { ...updated[idx], pickupLocation: address, pickupCoordinates: coords };
                            setForm({ ...form, passengers: updated });
                          }}
                          placeholder="Pickup location..."
                          markerColor="#059669"
                          markerLabel="P"
                        />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <LocationPicker
                          label="Passenger Dropoff"
                          value={p.dropoffLocation || ''}
                          coordinates={p.dropoffCoordinates}
                          onChange={(address, coords) => {
                            const updated = [...form.passengers];
                            updated[idx] = { ...updated[idx], dropoffLocation: address, dropoffCoordinates: coords };
                            setForm({ ...form, passengers: updated });
                          }}
                          placeholder="Dropoff location..."
                          markerColor="#dc2626"
                          markerLabel="D"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-input" rows={3} placeholder="Any additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowFormModal(false); setEditingTrip(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingTrip ? 'Update Allocation' : 'Create Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Driver Modal */}
      {showSwapDriverModal && (
        <div className="modal-overlay" onClick={() => setShowSwapDriverModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Swap Driver</h2>
              <button className="btn-icon" onClick={() => setShowSwapDriverModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSwapDriver}>
              <div className="modal-body">
                <div style={{ padding: '10px 12px', background: 'var(--color-gray-light)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Current: </span>
                  <span style={{ fontWeight: 600 }}>{getDriver(showSwapDriverModal)?.name || 'Unassigned'}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}> on </span>
                  <span style={{ fontWeight: 600 }}>{showSwapDriverModal.title}</span>
                </div>
                <div className="form-group">
                  <label>New Driver</label>
                  <select className="form-input" value={swapDriverForm.newDriverId} onChange={e => setSwapDriverForm({ ...swapDriverForm, newDriverId: e.target.value })} required>
                    <option value="">Select driver...</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name}{d.isTripAssigned ? ' [Already Assigned]' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reason for swap</label>
                  <input className="form-input" placeholder="e.g. Driver on leave" value={swapDriverForm.reason} onChange={e => setSwapDriverForm({ ...swapDriverForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSwapDriverModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><ArrowRightLeft size={16} /> Swap Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Vehicle Modal */}
      {showSwapVehicleModal && (
        <div className="modal-overlay" onClick={() => setShowSwapVehicleModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Swap Vehicle</h2>
              <button className="btn-icon" onClick={() => setShowSwapVehicleModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSwapVehicle}>
              <div className="modal-body">
                <div style={{ padding: '10px 12px', background: 'var(--color-gray-light)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Current: </span>
                  <span style={{ fontWeight: 600 }}>{getVehicle(showSwapVehicleModal)?.name || 'No vehicle'}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}> on </span>
                  <span style={{ fontWeight: 600 }}>{showSwapVehicleModal.title}</span>
                </div>
                <div className="form-group">
                  <label>New Vehicle</label>
                  <select className="form-input" value={swapVehicleForm.newVehicleId} onChange={e => setSwapVehicleForm({ ...swapVehicleForm, newVehicleId: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.name} ({v.type}) - {v.licensePlate}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reason for swap</label>
                  <input className="form-input" placeholder="e.g. Vehicle in maintenance" value={swapVehicleForm.reason} onChange={e => setSwapVehicleForm({ ...swapVehicleForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSwapVehicleModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><ArrowRightLeft size={16} /> Swap Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
