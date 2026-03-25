import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Car, Clock, MapPin, Users, AlertTriangle, CheckCircle2,
  X, UserCheck, Truck, Filter, Plus, ChevronRight, Timer, ArrowUp, RefreshCw,
  UserPlus, MapPinPlus, Eye, Hash, Share2
} from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';
import RideRequestModal from '../../components/RideRequestModal';
import RepeatScheduleModal from '../../components/RepeatScheduleModal';

const priorityConfig = {
  urgent: { color: 'var(--color-red)', bg: '#fef2f2', label: 'Urgent', icon: AlertTriangle },
  high: { color: '#ea580c', bg: '#fff7ed', label: 'High', icon: ArrowUp },
  normal: { color: 'var(--color-primary)', bg: '#eef2ff', label: 'Normal', icon: Car },
  low: { color: 'var(--color-text-tertiary)', bg: '#f1f5f9', label: 'Low', icon: Car }
};

const statusConfig = {
  pending: { color: 'var(--color-yellow)', label: 'Pending' },
  approved: { color: 'var(--color-blue)', label: 'Approved' },
  assigned: { color: 'var(--color-primary)', label: 'Assigned' },
  'in-progress': { color: 'var(--color-green)', label: 'In Progress' },
  completed: { color: 'var(--color-green)', label: 'Completed' },
  rejected: { color: 'var(--color-red)', label: 'Rejected' },
  cancelled: { color: 'var(--color-text-tertiary)', label: 'Cancelled' }
};

const departmentLabels = {
  'production': 'Production', 'ad-department': 'AD Dept', 'camera': 'Camera',
  'art': 'Art', 'hair-makeup': 'H/MU', 'wardrobe': 'Wardrobe',
  'sound': 'Sound', 'electric': 'Electric', 'grip': 'Grip',
  'locations': 'Locations', 'talent': 'Talent', 'other': 'Other'
};

const passengerStatusColors = {
  waiting: { bg: '#fffbeb', color: 'var(--color-yellow)' },
  'picked-up': { bg: '#eef2ff', color: 'var(--color-primary)' },
  'dropped-off': { bg: '#ecfdf5', color: 'var(--color-green)' }
};

export default function RideRequests() {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // request being assigned
  const [assignForm, setAssignForm] = useState({ driverId: '', vehicleId: '', eta: '' });
  const [showRepeat, setShowRepeat] = useState(false);

  // Shared ride feature states
  const [addStopOpen, setAddStopOpen] = useState({}); // { [rideId]: true/false }
  const [addStopForm, setAddStopForm] = useState({}); // { [rideId]: { location, action, passengerName } }
  const [addPassengerOpen, setAddPassengerOpen] = useState({});
  const [addPassengerForm, setAddPassengerForm] = useState({});
  const [activeCarsModal, setActiveCarsModal] = useState(false);
  const [activeCars, setActiveCars] = useState([]);
  const [activeCarsLoading, setActiveCarsLoading] = useState(false);
  const [activeCarsAddStopOpen, setActiveCarsAddStopOpen] = useState({});
  const [activeCarsAddStopForm, setActiveCarsAddStopForm] = useState({});

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadData();
    socket.on('rideRequest:new', handler);
    socket.on('rideRequest:updated', handler);
    return () => {
      socket.off('rideRequest:new', handler);
      socket.off('rideRequest:updated', handler);
    };
  }, [socket]);

  async function loadData() {
    try {
      const [reqs, drvs, vehs] = await Promise.all([
        apiFetch('/ride-requests'),
        apiFetch('/drivers'),
        apiFetch('/vehicles')
      ]);
      setRequests(reqs);
      setDrivers(drvs);
      setVehicles(vehs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    try {
      await apiFetch(`/ride-requests/${id}/approve`, { method: 'PUT' });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleReject(id) {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await apiFetch(`/ride-requests/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: reason || 'Request declined' })
      });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignModal || !assignForm.driverId) return;
    try {
      await apiFetch(`/ride-requests/${assignModal._id}/assign`, {
        method: 'PUT',
        body: JSON.stringify(assignForm)
      });
      setAssignModal(null);
      setAssignForm({ driverId: '', vehicleId: '', eta: '' });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleStatusUpdate(id, status) {
    try {
      await apiFetch(`/ride-requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (err) { alert(err.message); }
  }

  // --- Shared Ride Handlers ---

  async function handleAddStop(rideId) {
    const form = addStopForm[rideId];
    if (!form?.location || !form?.action) return;
    try {
      await apiFetch(`/ride-requests/${rideId}/add-stop`, {
        method: 'PUT',
        body: JSON.stringify({
          location: form.location,
          action: form.action,
          passengers: form.passengerName ? [{ name: form.passengerName }] : []
        })
      });
      setAddStopOpen(prev => ({ ...prev, [rideId]: false }));
      setAddStopForm(prev => ({ ...prev, [rideId]: undefined }));
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleAddPassenger(rideId, req) {
    const form = addPassengerForm[rideId];
    if (!form?.name) return;
    try {
      await apiFetch(`/ride-requests/${rideId}/add-passenger`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          pickupLocation: form.pickupLocation || req.pickupLocation,
          dropoffLocation: form.dropoffLocation || req.dropoffLocation
        })
      });
      setAddPassengerOpen(prev => ({ ...prev, [rideId]: false }));
      setAddPassengerForm(prev => ({ ...prev, [rideId]: undefined }));
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleCompleteStop(rideId, stopIndex) {
    try {
      await apiFetch(`/ride-requests/${rideId}/complete-stop/${stopIndex}`, { method: 'PUT' });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function loadActiveCars() {
    setActiveCarsLoading(true);
    try {
      const cars = await apiFetch('/ride-requests/active-cars');
      setActiveCars(cars);
      setActiveCarsModal(true);
    } catch (err) { alert(err.message); }
    finally { setActiveCarsLoading(false); }
  }

  async function handleActiveCarsAddStop(rideId) {
    const form = activeCarsAddStopForm[rideId];
    if (!form?.location || !form?.action) return;
    try {
      await apiFetch(`/ride-requests/${rideId}/add-stop`, {
        method: 'PUT',
        body: JSON.stringify({
          location: form.location,
          action: form.action,
          passengers: form.passengerName ? [{ name: form.passengerName }] : []
        })
      });
      setActiveCarsAddStopOpen(prev => ({ ...prev, [rideId]: false }));
      setActiveCarsAddStopForm(prev => ({ ...prev, [rideId]: undefined }));
      loadActiveCars();
    } catch (err) { alert(err.message); }
  }

  function getAvailableSeats(req) {
    const capacity = req.assignedVehicle?.capacity || 0;
    const sharedCount = req.sharedPassengers?.length || 0;
    return { available: Math.max(0, capacity - sharedCount - (req.passengerCount || 1)), total: capacity };
  }

  if (loading) return <SkeletonPage />;

  const tabs = [
    { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
    { key: 'active', label: 'Active', count: requests.filter(r => ['approved', 'assigned', 'in-progress'].includes(r.status)).length },
    { key: 'completed', label: 'Completed', count: requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status)).length }
  ];

  const filtered = requests.filter(r => {
    if (tab === 'pending') return r.status === 'pending';
    if (tab === 'active') return ['approved', 'assigned', 'in-progress'].includes(r.status);
    return ['completed', 'rejected', 'cancelled'].includes(r.status);
  });

  const isActiveRide = (status) => ['assigned', 'in-progress'].includes(status);

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Ride Requests</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadActiveCars} disabled={activeCarsLoading}>
            <Eye size={16} /> {activeCarsLoading ? 'Loading...' : 'View Active Cars'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowRepeat(true)}>
            <RefreshCw size={16} /> Repeat Schedule
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => setTab('pending')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fffbeb' }}><AlertTriangle size={20} color="var(--color-yellow)" /></div>
          <div className="stat-value">{requests.filter(r => r.status === 'pending').length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card" onClick={() => setTab('active')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#eef2ff' }}><Car size={20} color="var(--color-primary)" /></div>
          <div className="stat-value">{requests.filter(r => ['assigned', 'in-progress'].includes(r.status)).length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card" onClick={() => setTab('pending')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef2f2' }}><Timer size={20} color="var(--color-red)" /></div>
          <div className="stat-value">{requests.filter(r => r.priority === 'urgent' && r.status === 'pending').length}</div>
          <div className="stat-label">Urgent</div>
        </div>
        <div className="stat-card" onClick={() => setTab('completed')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ecfdf5' }}><CheckCircle2 size={20} color="var(--color-green)" /></div>
          <div className="stat-value">{requests.filter(r => r.status === 'completed').length}</div>
          <div className="stat-label">Completed Today</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`filter-pill ${tab === t.key ? 'active' : ''}`}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--color-primary)' : 'var(--color-gray-light)',
              color: tab === t.key ? 'white' : 'var(--color-text-secondary)'
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: 6, padding: '2px 7px', borderRadius: 10,
                background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
                fontSize: 11
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request List */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Car size={28} /></div>
          <h3>No {tab} requests</h3>
          <p>{tab === 'pending' ? 'All caught up! No pending ride requests.' : `No ${tab} ride requests to show.`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(req => {
            const pConfig = priorityConfig[req.priority] || priorityConfig.normal;
            const sConfig = statusConfig[req.status] || statusConfig.pending;
            const PriorityIcon = pConfig.icon;
            const seats = getAvailableSeats(req);

            return (
              <div key={req._id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: pConfig.bg, color: pConfig.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <PriorityIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {req.requester?.name || 'Unknown'}
                        {req.requester?.hasOwnTransport && (
                          <span style={{
                            fontSize: 11, padding: '1px 6px', borderRadius: 6,
                            background: '#f0fdf4', color: 'var(--color-green)',
                            fontWeight: 600, whiteSpace: 'nowrap'
                          }}>
                            Own Transport
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {departmentLabels[req.department] || req.department} · {req.passengerCount} {req.passengerCount === 1 ? 'person' : 'people'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Shared Ride badge */}
                    {req.isSharedRide && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                        background: '#ede9fe', color: '#7c3aed', textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Share2 size={11} /> Shared
                      </span>
                    )}
                    {/* Available seats indicator */}
                    {isActiveRide(req.status) && req.assignedVehicle?.capacity && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                        background: seats.available > 0 ? '#ecfdf5' : '#fef2f2',
                        color: seats.available > 0 ? 'var(--color-green)' : 'var(--color-red)',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Users size={11} /> {seats.available}/{seats.total} seats
                      </span>
                    )}
                    <span className={`badge badge-${req.priority === 'urgent' ? 'red' : req.priority === 'low' ? 'gray' : 'blue'}`}>
                      <span className="badge-dot" />{pConfig.label}
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                      background: `${sConfig.color}18`, color: sConfig.color, textTransform: 'uppercase'
                    }}>
                      {sConfig.label}
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14 }}>
                  <MapPin size={15} color="var(--color-green)" />
                  <span style={{ fontWeight: 600 }}>{req.pickupLocation}</span>
                  <ChevronRight size={14} color="var(--color-text-tertiary)" />
                  <MapPin size={15} color="var(--color-red)" />
                  <span style={{ fontWeight: 600 }}>{req.dropoffLocation}</span>
                </div>

                {/* Time + Notes */}
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} />
                    {new Date(req.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {req.eta && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Timer size={13} /> ETA: {req.eta} min
                    </span>
                  )}
                  {req.notes && (
                    <span style={{ fontStyle: 'italic' }}>"{req.notes}"</span>
                  )}
                </div>

                {/* Assigned Info */}
                {req.assignedDriver && (
                  <div style={{ padding: 10, background: 'var(--color-gray-light)', borderRadius: 'var(--radius-sm)', marginBottom: 10, fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserCheck size={14} color="var(--color-green)" />
                      <strong>{req.assignedDriver.name}</strong>
                      {req.assignedVehicle && (
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          · {req.assignedVehicle.name} ({req.assignedVehicle.licensePlate})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Stops List */}
                {req.stops && req.stops.length > 0 && (
                  <div style={{ marginBottom: 10, padding: 10, background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Route Stops
                    </div>
                    {req.stops.map((stop, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 0', borderBottom: idx < req.stops.length - 1 ? '1px solid var(--color-border)' : 'none',
                        fontSize: 13
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: stop.completed ? '#ecfdf5' : '#eef2ff',
                            color: stop.completed ? 'var(--color-green)' : 'var(--color-primary)'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600 }}>{stop.location}</span>
                          <span style={{
                            padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: stop.action === 'pickup' ? '#ecfdf5' : stop.action === 'dropoff' ? '#fef2f2' : '#ede9fe',
                            color: stop.action === 'pickup' ? 'var(--color-green)' : stop.action === 'dropoff' ? 'var(--color-red)' : '#7c3aed',
                            textTransform: 'uppercase'
                          }}>
                            {stop.action}
                          </span>
                          {stop.passengers?.map((p, pIdx) => (
                            <span key={pIdx} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              — {p.name} {stop.completed ? '\u2713' : '(pending)'}
                            </span>
                          ))}
                          {(!stop.passengers || stop.passengers.length === 0) && (
                            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                              {stop.completed ? '\u2713' : '(pending)'}
                            </span>
                          )}
                        </div>
                        {!stop.completed && isActiveRide(req.status) && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleCompleteStop(req._id, idx)}
                          >
                            <CheckCircle2 size={11} /> Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Shared Passengers List */}
                {req.sharedPassengers && req.sharedPassengers.length > 0 && (
                  <div style={{ marginBottom: 10, padding: 10, background: '#faf5ff', borderRadius: 'var(--radius-sm)', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Shared Passengers
                    </div>
                    {req.sharedPassengers.map((p, idx) => {
                      const pStatusStyle = passengerStatusColors[p.status] || passengerStatusColors.waiting;
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '5px 0', borderBottom: idx < req.sharedPassengers.length - 1 ? '1px solid #e9d5ff' : 'none',
                          fontSize: 13
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users size={13} color="#7c3aed" />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              {p.pickupLocation} <ChevronRight size={10} style={{ verticalAlign: 'middle' }} /> {p.dropoffLocation}
                            </span>
                          </div>
                          <span style={{
                            padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                            background: pStatusStyle.bg, color: pStatusStyle.color, textTransform: 'uppercase'
                          }}>
                            {p.status || 'waiting'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {req.status === 'pending' && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setAssignModal(req);
                        setAssignForm({ driverId: '', vehicleId: '', eta: '' });
                      }}>
                        <UserCheck size={13} /> Approve & Assign
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => handleApprove(req._id)}>
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>
                        <X size={13} /> Reject
                      </button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setAssignModal(req);
                      setAssignForm({ driverId: '', vehicleId: '', eta: '' });
                    }}>
                      <Truck size={13} /> Assign Driver
                    </button>
                  )}
                  {req.status === 'assigned' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(req._id, 'in-progress')}>
                      <Car size={13} /> Start Ride
                    </button>
                  )}
                  {req.status === 'in-progress' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(req._id, 'completed')}>
                      <CheckCircle2 size={13} /> Complete
                    </button>
                  )}
                  {/* Add Stop & Add Passenger buttons for active rides */}
                  {isActiveRide(req.status) && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setAddStopOpen(prev => ({ ...prev, [req._id]: !prev[req._id] }));
                          if (!addStopForm[req._id]) {
                            setAddStopForm(prev => ({ ...prev, [req._id]: { location: '', action: 'pickup', passengerName: '' } }));
                          }
                        }}
                      >
                        <MapPinPlus size={13} /> Add Stop
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setAddPassengerOpen(prev => ({ ...prev, [req._id]: !prev[req._id] }));
                          if (!addPassengerForm[req._id]) {
                            setAddPassengerForm(prev => ({
                              ...prev,
                              [req._id]: { name: '', pickupLocation: req.pickupLocation, dropoffLocation: req.dropoffLocation }
                            }));
                          }
                        }}
                      >
                        <UserPlus size={13} /> Add Passenger
                      </button>
                    </>
                  )}
                </div>

                {/* Add Stop Inline Form */}
                {addStopOpen[req._id] && (
                  <div style={{
                    marginTop: 10, padding: 12, background: 'var(--color-gray-light)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-secondary)' }}>
                      Add Stop to Route
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 160px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Location</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Stop location"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addStopForm[req._id]?.location || ''}
                          onChange={e => setAddStopForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], location: e.target.value }
                          }))}
                        />
                      </div>
                      <div style={{ flex: '0 0 110px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Action</label>
                        <select
                          className="form-input"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addStopForm[req._id]?.action || 'pickup'}
                          onChange={e => setAddStopForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], action: e.target.value }
                          }))}
                        >
                          <option value="pickup">Pickup</option>
                          <option value="dropoff">Dropoff</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Passenger (optional)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Passenger name"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addStopForm[req._id]?.passengerName || ''}
                          onChange={e => setAddStopForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], passengerName: e.target.value }
                          }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleAddStop(req._id)}>
                          <Plus size={12} /> Add
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddStopOpen(prev => ({ ...prev, [req._id]: false }))}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Passenger Inline Form */}
                {addPassengerOpen[req._id] && (
                  <div style={{
                    marginTop: 10, padding: 12, background: '#faf5ff',
                    borderRadius: 'var(--radius-sm)', border: '1px solid #e9d5ff'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#7c3aed' }}>
                      Add Passenger to Shared Ride
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Passenger name"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addPassengerForm[req._id]?.name || ''}
                          onChange={e => setAddPassengerForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], name: e.target.value }
                          }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Pickup</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Pickup location"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addPassengerForm[req._id]?.pickupLocation || ''}
                          onChange={e => setAddPassengerForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], pickupLocation: e.target.value }
                          }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>Dropoff</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Dropoff location"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={addPassengerForm[req._id]?.dropoffLocation || ''}
                          onChange={e => setAddPassengerForm(prev => ({
                            ...prev, [req._id]: { ...prev[req._id], dropoffLocation: e.target.value }
                          }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleAddPassenger(req._id, req)}>
                          <Plus size={12} /> Add
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddPassengerOpen(prev => ({ ...prev, [req._id]: false }))}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {req.status === 'rejected' && req.rejectionReason && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-red)', fontStyle: 'italic' }}>
                    Reason: {req.rejectionReason}
                  </div>
                )}

                {/* Timestamp */}
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  Requested {new Date(req.createdAt).toLocaleString()}
                  {req.completedAt && ` · Completed ${new Date(req.completedAt).toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Assign Driver</h2>
              <button className="btn-icon" onClick={() => setAssignModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div style={{ padding: 12, background: 'var(--color-gray-light)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
                  <strong>{assignModal.requester?.name}</strong> needs a ride from <strong>{assignModal.pickupLocation}</strong> to <strong>{assignModal.dropoffLocation}</strong> for {assignModal.passengerCount} {assignModal.passengerCount === 1 ? 'person' : 'people'}
                </div>
                <div className="form-group">
                  <label>Driver</label>
                  <select className="form-input" value={assignForm.driverId} onChange={e => setAssignForm({ ...assignForm, driverId: e.target.value })} required>
                    <option value="">Select driver...</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name}{d.phone ? ` (${d.phone})` : ''}{!d.isAvailable ? ' [Busy]' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle (optional)</label>
                  <select className="form-input" value={assignForm.vehicleId} onChange={e => setAssignForm({ ...assignForm, vehicleId: e.target.value })}>
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.name} ({v.licensePlate}) · {v.type} · {v.capacity} seats{v.status !== 'available' ? ` [${v.status}]` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ETA (minutes)</label>
                  <input type="number" className="form-input" min="1" max="120" placeholder="e.g. 10" value={assignForm.eta} onChange={e => setAssignForm({ ...assignForm, eta: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign & Notify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Cars Modal */}
      {activeCarsModal && (
        <div className="modal-overlay" onClick={() => setActiveCarsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Active Cars</h2>
              <button className="btn-icon" onClick={() => setActiveCarsModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {activeCars.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
                  No active cars on routes right now.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeCars.map(car => {
                    const vehicle = car.assignedVehicle || car.vehicle;
                    const driver = car.assignedDriver || car.driver;
                    const capacity = car.vehicleCapacity || vehicle?.capacity || '?';
                    const carSeats = car.availableSeats != null
                      ? { available: car.availableSeats, total: capacity }
                      : { available: '?', total: capacity };
                    return (
                      <div key={car._id || car.rideId} style={{
                        padding: 12, background: 'var(--color-gray-light)',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Car size={16} color="var(--color-primary)" />
                            <strong style={{ fontSize: 14 }}>
                              {vehicle?.name || 'Vehicle'}
                              {vehicle?.licensePlate && ` (${vehicle.licensePlate})`}
                            </strong>
                          </div>
                          <span style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                            background: carSeats.available > 0 ? '#ecfdf5' : '#fef2f2',
                            color: carSeats.available > 0 ? 'var(--color-green)' : 'var(--color-red)'
                          }}>
                            {carSeats.available}/{carSeats.total} seats
                          </span>
                        </div>
                        {driver && (
                          <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                            Driver: <strong>{driver.name || 'Unassigned'}</strong>
                          </div>
                        )}
                        <div style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color="var(--color-green)" />
                          {car.pickupLocation} → {car.dropoffLocation}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: 4 }}
                          onClick={() => {
                            const rideId = car._id || car.rideId;
                            setActiveCarsAddStopOpen(prev => ({ ...prev, [rideId]: !prev[rideId] }));
                            if (!activeCarsAddStopForm[rideId]) {
                              setActiveCarsAddStopForm(prev => ({
                                ...prev, [rideId]: { location: '', action: 'pickup', passengerName: '' }
                              }));
                            }
                          }}
                        >
                          <MapPinPlus size={12} /> Add Stop
                        </button>
                        {activeCarsAddStopOpen[car._id || car.rideId] && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Location"
                              style={{ fontSize: 12, padding: '5px 8px', flex: '1 1 120px' }}
                              value={activeCarsAddStopForm[car._id || car.rideId]?.location || ''}
                              onChange={e => {
                                const rid = car._id || car.rideId;
                                setActiveCarsAddStopForm(prev => ({
                                  ...prev, [rid]: { ...prev[rid], location: e.target.value }
                                }));
                              }}
                            />
                            <select
                              className="form-input"
                              style={{ fontSize: 12, padding: '5px 8px', flex: '0 0 90px' }}
                              value={activeCarsAddStopForm[car._id || car.rideId]?.action || 'pickup'}
                              onChange={e => {
                                const rid = car._id || car.rideId;
                                setActiveCarsAddStopForm(prev => ({
                                  ...prev, [rid]: { ...prev[rid], action: e.target.value }
                                }));
                              }}
                            >
                              <option value="pickup">Pickup</option>
                              <option value="dropoff">Dropoff</option>
                              <option value="both">Both</option>
                            </select>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Passenger"
                              style={{ fontSize: 12, padding: '5px 8px', flex: '1 1 100px' }}
                              value={activeCarsAddStopForm[car._id || car.rideId]?.passengerName || ''}
                              onChange={e => {
                                const rid = car._id || car.rideId;
                                setActiveCarsAddStopForm(prev => ({
                                  ...prev, [rid]: { ...prev[rid], passengerName: e.target.value }
                                }));
                              }}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              onClick={() => handleActiveCarsAddStop(car._id || car.rideId)}
                            >
                              <Plus size={11} /> Add
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveCarsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showModal && (
        <RideRequestModal onClose={() => setShowModal(false)} onCreated={loadData} />
      )}

      {/* Repeat Schedule Modal */}
      {showRepeat && (
        <RepeatScheduleModal onClose={() => setShowRepeat(false)} onCreated={loadData} />
      )}
    </div>
  );
}
