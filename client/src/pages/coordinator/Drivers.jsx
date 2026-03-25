import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Phone, CreditCard, CalendarDays, Users, UserCheck, UserX, X, Link2, Unlink, ArrowRightLeft, PhoneCall, Car, Shield, AlertTriangle } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import './Drivers.css';

export default function Drivers() {
  const { apiFetch } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('drivers'); // 'drivers' | 'allocations'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', licenseNumber: '' });

  // PA state
  const [allocations, setAllocations] = useState([]);
  const [showPAModal, setShowPAModal] = useState(false);
  const [passengers, setPassengers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [paForm, setPaForm] = useState({ driverId: '', actorId: '', vehicleId: '', callConfig: 'coordinator' });
  const [releaseNote, setReleaseNote] = useState('');
  const [releasingDriver, setReleasingDriver] = useState(null);

  useEffect(() => { loadDrivers(); }, []);
  useEffect(() => { if (tab === 'allocations') loadAllocations(); }, [tab]);

  async function loadDrivers() {
    try {
      const data = await apiFetch('/drivers');
      setDrivers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadAllocations() {
    try {
      const [allocs, pax, vehs] = await Promise.all([
        apiFetch('/allocations'),
        apiFetch('/auth/users?role=passenger'),
        apiFetch('/vehicles')
      ]);
      setAllocations(allocs);
      setPassengers(pax);
      setVehicles(vehs);
    } catch (err) { console.error(err); }
  }

  async function toggleAvailability(driverId) {
    try {
      await apiFetch(`/drivers/${driverId}/availability`, { method: 'PUT' });
      loadDrivers();
    } catch (err) { alert(err.message); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, role: 'driver' })
      });
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', licenseNumber: '' });
      loadDrivers();
    } catch (err) { alert(err.message); }
  }

  async function handleAllocate(e) {
    e.preventDefault();
    try {
      await apiFetch(`/allocations/${paForm.driverId}/allocate`, {
        method: 'PUT',
        body: JSON.stringify({ actorId: paForm.actorId, vehicleId: paForm.vehicleId || undefined, callConfig: paForm.callConfig })
      });
      setShowPAModal(false);
      setPaForm({ driverId: '', actorId: '', vehicleId: '', callConfig: 'coordinator' });
      loadAllocations();
      loadDrivers();
    } catch (err) { alert(err.message); }
  }

  async function handleTempRelease(driverId) {
    try {
      await apiFetch(`/allocations/${driverId}/release-temp`, {
        method: 'PUT',
        body: JSON.stringify({ note: releaseNote })
      });
      setReleasingDriver(null);
      setReleaseNote('');
      loadAllocations();
    } catch (err) { alert(err.message); }
  }

  async function handleRecall(driverId) {
    try {
      await apiFetch(`/allocations/${driverId}/recall`, { method: 'PUT' });
      loadAllocations();
    } catch (err) { alert(err.message); }
  }

  async function handleRemovePA(driverId) {
    if (!confirm('Remove this permanent allocation?')) return;
    try {
      await apiFetch(`/allocations/${driverId}`, { method: 'DELETE' });
      loadAllocations();
      loadDrivers();
    } catch (err) { alert(err.message); }
  }

  async function handleGiveCall(driverId, actorId) {
    const pickup = prompt('Pickup location:');
    if (!pickup) return;
    const dropoff = prompt('Dropoff location:');
    if (!dropoff) return;
    try {
      await apiFetch(`/ride-requests/call/${actorId}`, {
        method: 'POST',
        body: JSON.stringify({ pickupLocation: pickup, dropoffLocation: dropoff })
      });
      alert('Call dispatched!');
    } catch (err) { alert(err.message); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const available = drivers.filter(d => d.isAvailable && d.isActive);
  const unavailable = drivers.filter(d => !d.isAvailable || !d.isActive);

  // Find PA info for a driver
  function getDriverPA(driverId) {
    return allocations.find(a => a._id === driverId);
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Drivers</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'allocations' && (
            <button className="btn btn-success" onClick={() => { setShowPAModal(true); loadAllocations(); }}>
              <Link2 size={16} /> Set PA
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Driver
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-gray-light)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[
          { id: 'drivers', label: 'All Drivers', count: drivers.length },
          { id: 'allocations', label: 'Permanent Allocations', count: allocations.length }
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

      {tab === 'drivers' && (
        <>
          <div className="grid-3" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Users size={20} /></div>
              <div className="stat-value">{drivers.length}</div>
              <div className="stat-label">Total Drivers</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}><UserCheck size={20} /></div>
              <div className="stat-value" style={{ color: 'var(--color-green)' }}>{available.length}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f1f5f9', color: 'var(--color-gray)' }}><UserX size={20} /></div>
              <div className="stat-value" style={{ color: 'var(--color-gray)' }}>{unavailable.length}</div>
              <div className="stat-label">Unavailable</div>
            </div>
          </div>

          {drivers.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon"><Users size={28} /></div>
              <h3>No drivers yet</h3>
              <p>Add your first driver to get started</p>
            </div>
          ) : (
            <div className="grid-3">
              {drivers.map(d => {
                const pa = d.permanentAllocation?.allocatedTo;
                return (
                  <div key={d._id} className="card driver-card">
                    <div className="driver-card-header">
                      <div className="driver-avatar">{d.name.charAt(0)}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {pa && (
                          <span style={{
                            padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                            background: d.permanentAllocation?.isTemporaryRelease ? '#fef3c7' : '#dbeafe',
                            color: d.permanentAllocation?.isTemporaryRelease ? '#92400e' : '#1e40af'
                          }}>
                            PA: {typeof pa === 'object' ? pa.name : 'Assigned'}
                          </span>
                        )}
                        <StatusBadge status={d.isAvailable ? 'on-duty' : 'off-duty'} />
                      </div>
                    </div>
                    <h3 className="driver-name">{d.name}</h3>
                    {d.isTemporary && <span className="badge badge-yellow" style={{ alignSelf: 'flex-start' }}>Temporary</span>}
                    <div className="driver-meta">
                      {d.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} color="var(--color-text-tertiary)" /> {d.phone}
                        </div>
                      )}
                      {d.licenseNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CreditCard size={13} color="var(--color-text-tertiary)" /> {d.licenseNumber}
                        </div>
                      )}
                      {d.licenseExpiry && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: new Date(d.licenseExpiry) < new Date() ? 'var(--color-red)' : 'inherit' }}>
                          <CalendarDays size={13} color={new Date(d.licenseExpiry) < new Date() ? 'var(--color-red)' : 'var(--color-text-tertiary)'} />
                          Expires {new Date(d.licenseExpiry).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="driver-actions">
                      <button className={`btn btn-sm ${d.isAvailable ? 'btn-secondary' : 'btn-success'}`} onClick={() => toggleAvailability(d._id)}>
                        {d.isAvailable ? 'Set Unavailable' : 'Set Available'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'allocations' && (
        <>
          {allocations.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon"><Link2 size={28} /></div>
              <h3>No permanent allocations</h3>
              <p>Assign a driver permanently to an actor with their dedicated vehicle</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setShowPAModal(true); loadAllocations(); }}>
                <Link2 size={16} /> Set First PA
              </button>
            </div>
          ) : (
            <div className="grid-2">
              {allocations.map(driver => {
                const pa = driver.permanentAllocation;
                const actor = pa?.allocatedTo;
                const vehicle = pa?.vehicle;
                const isReleased = pa?.isTemporaryRelease;

                return (
                  <div key={driver._id} className="card" style={{ border: isReleased ? '2px solid #f59e0b' : '2px solid #4f46e5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: isReleased ? '#fef3c7' : '#dbeafe',
                        color: isReleased ? '#92400e' : '#1e40af'
                      }}>
                        {isReleased ? 'TEMP RELEASED' : 'ACTIVE PA'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                        Call by: {pa?.callConfig === 'actor' ? 'Actor' : 'Coordinator'}
                      </span>
                    </div>

                    {/* Driver → Actor → Vehicle flow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, margin: '0 auto 6px' }}>
                          {driver.name?.charAt(0)}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{driver.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Driver</div>
                        {driver.phone && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{driver.phone}</div>}
                      </div>

                      <ArrowRightLeft size={20} color="var(--color-text-tertiary)" />

                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, margin: '0 auto 6px' }}>
                          {actor?.name?.charAt(0) || '?'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{actor?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Actor</div>
                        {actor?.phone && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{actor.phone}</div>}
                      </div>
                    </div>

                    {vehicle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-gray-light)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                        <Car size={15} color="var(--color-text-tertiary)" />
                        <span style={{ fontWeight: 600 }}>{vehicle.name}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>· {vehicle.licensePlate}</span>
                      </div>
                    )}

                    {isReleased && pa?.temporaryReleaseNote && (
                      <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} /> {pa.temporaryReleaseNote}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {!isReleased ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleGiveCall(driver._id, actor?._id)}>
                            <PhoneCall size={13} /> Give Call
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setReleasingDriver(driver._id)} style={{ color: '#d97706' }}>
                            <Unlink size={13} /> Temp Release
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-success" onClick={() => handleRecall(driver._id)}>
                          <Link2 size={13} /> Recall Driver
                        </button>
                      )}
                      <button className="btn btn-sm" onClick={() => handleRemovePA(driver._id)} style={{ color: 'var(--color-red)', background: 'rgba(220,38,38,0.08)' }}>
                        <X size={13} /> Remove PA
                      </button>
                    </div>

                    {/* Temp Release Note Input */}
                    {releasingDriver === driver._id && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                        <input
                          className="form-input"
                          placeholder="Release reason..."
                          value={releaseNote}
                          onChange={e => setReleaseNote(e.target.value)}
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => handleTempRelease(driver._id)}>Confirm</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setReleasingDriver(null); setReleaseNote(''); }}>Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Driver Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Driver</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input className="form-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>License Number</label>
                    <input className="form-input" value={form.licenseNumber} onChange={(e) => setForm({...form, licenseNumber: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set PA Modal */}
      {showPAModal && (
        <div className="modal-overlay" onClick={() => setShowPAModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Set Permanent Allocation</h2>
              <button className="btn-icon" onClick={() => setShowPAModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAllocate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Driver</label>
                  <select className="form-input" value={paForm.driverId} onChange={e => setPaForm({...paForm, driverId: e.target.value})} required>
                    <option value="">Select driver...</option>
                    {drivers.filter(d => !d.permanentAllocation?.allocatedTo).map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign to Actor / Passenger</label>
                  <select className="form-input" value={paForm.actorId} onChange={e => setPaForm({...paForm, actorId: e.target.value})} required>
                    <option value="">Select actor...</option>
                    {passengers.filter(p => !p.myDriver).map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign Vehicle (optional)</label>
                  <select className="form-input" value={paForm.vehicleId} onChange={e => setPaForm({...paForm, vehicleId: e.target.value})}>
                    <option value="">No vehicle</option>
                    {vehicles.filter(v => !v.permanentDriver && v.status !== 'maintenance').map(v => (
                      <option key={v._id} value={v._id}>{v.name} - {v.licensePlate} ({v.type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Who gives the call?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['actor', 'coordinator'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPaForm({...paForm, callConfig: opt})}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${paForm.callConfig === opt ? '#4f46e5' : 'var(--color-border)'}`,
                          background: paForm.callConfig === opt ? 'rgba(79,70,229,0.08)' : 'transparent',
                          color: paForm.callConfig === opt ? '#4f46e5' : 'var(--color-text-secondary)',
                          fontSize: 13, fontWeight: 700, textTransform: 'capitalize'
                        }}
                      >
                        {opt === 'actor' ? 'Actor gives call' : 'Coordinator gives call'}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                    {paForm.callConfig === 'actor'
                      ? 'The actor can directly call their driver from the app'
                      : 'Only the coordinator can dispatch this driver'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPAModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Link2 size={16} /> Set Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
