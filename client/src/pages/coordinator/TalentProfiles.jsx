import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Star, Plus, X, User, Car, Thermometer, Music, Droplets,
  Cookie, Phone, MapPin, Eye, EyeOff, Navigation, CheckCircle2,
  Edit2, Trash2, Send
} from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

const statusLabels = {
  'at-home': 'At Home', 'at-hotel': 'At Hotel', 'traveling': 'Traveling',
  'on-set': 'On Set', 'in-hair-makeup': 'In H/MU', 'in-wardrobe': 'In Wardrobe', 'wrapped': 'Wrapped'
};

const statusColors = {
  'at-home': 'var(--color-text-tertiary)', 'at-hotel': 'var(--color-blue)',
  'traveling': 'var(--color-yellow)', 'on-set': 'var(--color-green)',
  'in-hair-makeup': 'var(--color-primary)', 'in-wardrobe': 'var(--color-primary)', 'wrapped': 'var(--color-text-tertiary)'
};

export default function TalentProfiles() {
  const { apiFetch } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [form, setForm] = useState({
    userId: '', preferredDriver: '', homeAddress: '', hotelAddress: '',
    agentName: '', agentPhone: '', confidential: true,
    preferences: { vehicleType: '', temperature: 'Normal', music: 'No preference', waterBrand: '', snacks: '', otherNotes: '' }
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [profs, contacts] = await Promise.all([
        apiFetch('/talent'),
        apiFetch('/chat/contacts')
      ]);
      setProfiles(profs);
      setPassengers(contacts.filter(c => c.role === 'passenger'));
      setDrivers(contacts.filter(c => c.role === 'driver'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditProfile(null);
    setForm({
      userId: '', preferredDriver: '', homeAddress: '', hotelAddress: '',
      agentName: '', agentPhone: '', confidential: true,
      preferences: { vehicleType: '', temperature: 'Normal', music: 'No preference', waterBrand: '', snacks: '', otherNotes: '' }
    });
    setShowModal(true);
  }

  function openEdit(profile) {
    setEditProfile(profile);
    setForm({
      userId: profile.user?._id || '',
      preferredDriver: profile.preferredDriver?._id || '',
      homeAddress: profile.homeAddress || '',
      hotelAddress: profile.hotelAddress || '',
      agentName: profile.agentName || '',
      agentPhone: profile.agentPhone || '',
      confidential: profile.confidential,
      preferences: {
        vehicleType: profile.preferences?.vehicleType || '',
        temperature: profile.preferences?.temperature || 'Normal',
        music: profile.preferences?.music || 'No preference',
        waterBrand: profile.preferences?.waterBrand || '',
        snacks: profile.preferences?.snacks?.join(', ') || '',
        otherNotes: profile.preferences?.otherNotes || ''
      }
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      preferences: {
        ...form.preferences,
        snacks: form.preferences.snacks ? form.preferences.snacks.split(',').map(s => s.trim()).filter(Boolean) : []
      }
    };
    try {
      if (editProfile) {
        await apiFetch(`/talent/${editProfile._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/talent', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowModal(false);
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this talent profile?')) return;
    try {
      await apiFetch(`/talent/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleBroadcast(profile, type) {
    const endpoint = type === 'traveling' ? 'traveling' : 'arrived';
    const destination = type === 'traveling'
      ? prompt('Destination? (e.g. Set, Hair/Makeup)', 'Set')
      : prompt('Arrived where? (e.g. Set, Base Camp)', 'Set');
    if (destination === null) return;

    try {
      await apiFetch(`/talent/${profile._id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(type === 'traveling' ? { destination } : { location: destination })
      });
      loadData();
    } catch (err) { alert(err.message); }
  }

  if (loading) return <SkeletonPage />;

  // Filter out passengers already having profiles
  const existingUserIds = new Set(profiles.map(p => p.user?._id));
  const availablePassengers = passengers.filter(p => !existingUserIds.has(p._id));

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Talent Profiles</h1>
        <button className="btn btn-primary" onClick={openCreate} disabled={availablePassengers.length === 0}>
          <Plus size={18} /> Add Talent
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Star size={28} /></div>
          <h3>No talent profiles</h3>
          <p>Create profiles for cast members to manage their transport preferences</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profiles.map(profile => (
            <div key={profile._id} className="card" style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'var(--color-yellow)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18
                  }}>
                    {profile.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
                      {profile.user?.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {profile.user?.phone && <><Phone size={12} /> {profile.user.phone}</>}
                      {profile.confidential && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-yellow)' }}>
                          <EyeOff size={12} /> Confidential
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: `${statusColors[profile.currentStatus]}18`,
                    color: statusColors[profile.currentStatus],
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase'
                  }}>
                    {statusLabels[profile.currentStatus]}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(profile)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => handleDelete(profile._id)}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Preferred Driver */}
              {profile.preferredDriver && (
                <div style={{ padding: 10, background: 'var(--color-green-light, #ecfdf5)', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={14} color="var(--color-green)" />
                  <span style={{ fontWeight: 600 }}>Preferred Driver:</span> {profile.preferredDriver.name}
                  {profile.preferredDriver.phone && <span style={{ color: 'var(--color-text-secondary)' }}>({profile.preferredDriver.phone})</span>}
                </div>
              )}

              {/* Preferences Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {profile.preferences?.vehicleType && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'var(--color-gray-light)', fontSize: 12, fontWeight: 600 }}>
                    <Car size={13} /> {profile.preferences.vehicleType}
                  </span>
                )}
                {profile.preferences?.temperature && profile.preferences.temperature !== 'Normal' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'var(--color-gray-light)', fontSize: 12, fontWeight: 600 }}>
                    <Thermometer size={13} /> {profile.preferences.temperature}
                  </span>
                )}
                {profile.preferences?.music && profile.preferences.music !== 'No preference' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'var(--color-gray-light)', fontSize: 12, fontWeight: 600 }}>
                    <Music size={13} /> {profile.preferences.music}
                  </span>
                )}
                {profile.preferences?.waterBrand && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'var(--color-gray-light)', fontSize: 12, fontWeight: 600 }}>
                    <Droplets size={13} /> {profile.preferences.waterBrand}
                  </span>
                )}
                {profile.preferences?.snacks?.map((snack, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'var(--color-gray-light)', fontSize: 12, fontWeight: 600 }}>
                    <Cookie size={13} /> {snack}
                  </span>
                ))}
              </div>

              {/* Addresses */}
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14, flexWrap: 'wrap' }}>
                {profile.hotelAddress && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} /> Hotel: {profile.hotelAddress}</span>
                )}
                {profile.agentName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} /> Agent: {profile.agentName} {profile.agentPhone ? `(${profile.agentPhone})` : ''}</span>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleBroadcast(profile, 'traveling')}>
                  <Navigation size={13} /> Talent Traveling
                </button>
                <button className="btn btn-success btn-sm" onClick={() => handleBroadcast(profile, 'arrived')}>
                  <CheckCircle2 size={13} /> Talent Arrived
                </button>
              </div>

              {/* Cost Tracking */}
              {(profile.costTracking?.totalTrips > 0) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 24, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  <span>{profile.costTracking.totalTrips} trips</span>
                  <span>${profile.costTracking.totalCost?.toFixed(0)} total cost</span>
                  <span>{profile.costTracking.totalMiles} miles</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>{editProfile ? 'Edit Talent Profile' : 'New Talent Profile'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editProfile && (
                  <div className="form-group">
                    <label>Talent (Actor/Passenger)</label>
                    <select className="form-input" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required>
                      <option value="">Select talent...</option>
                      {availablePassengers.map(p => (
                        <option key={p._id} value={p._id}>{p.name}{p.phone ? ` (${p.phone})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Preferred Driver</label>
                  <select className="form-input" value={form.preferredDriver} onChange={e => setForm({ ...form, preferredDriver: e.target.value })}>
                    <option value="">No preference</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Vehicle Preference</label>
                    <select className="form-input" value={form.preferences.vehicleType} onChange={e => setForm({ ...form, preferences: { ...form.preferences, vehicleType: e.target.value } })}>
                      <option value="">Any</option>
                      <option value="SUV">SUV</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Van">Van</option>
                      <option value="Minibus">Minibus</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Temperature</label>
                    <select className="form-input" value={form.preferences.temperature} onChange={e => setForm({ ...form, preferences: { ...form.preferences, temperature: e.target.value } })}>
                      <option value="Normal">Normal</option>
                      <option value="Cool">Cool</option>
                      <option value="Warm">Warm</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Music Preference</label>
                    <select className="form-input" value={form.preferences.music} onChange={e => setForm({ ...form, preferences: { ...form.preferences, music: e.target.value } })}>
                      <option value="No preference">No preference</option>
                      <option value="No music">No music (quiet)</option>
                      <option value="Classical">Classical</option>
                      <option value="Pop">Pop</option>
                      <option value="Jazz">Jazz</option>
                      <option value="R&B">R&B</option>
                      <option value="Rock">Rock</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Water Brand</label>
                    <input className="form-input" placeholder="e.g. Fiji, Evian" value={form.preferences.waterBrand} onChange={e => setForm({ ...form, preferences: { ...form.preferences, waterBrand: e.target.value } })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Snacks (comma-separated)</label>
                  <input className="form-input" placeholder="e.g. Almonds, Protein bars, Dark chocolate" value={form.preferences.snacks} onChange={e => setForm({ ...form, preferences: { ...form.preferences, snacks: e.target.value } })} />
                </div>

                <div className="form-group">
                  <label>Other Notes</label>
                  <input className="form-input" placeholder="Any other preferences..." value={form.preferences.otherNotes} onChange={e => setForm({ ...form, preferences: { ...form.preferences, otherNotes: e.target.value } })} />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Hotel Address</label>
                    <input className="form-input" placeholder="Hotel name & address" value={form.hotelAddress} onChange={e => setForm({ ...form, hotelAddress: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Home Address</label>
                    <input className="form-input" placeholder="Confidential" value={form.homeAddress} onChange={e => setForm({ ...form, homeAddress: e.target.value })} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Agent Name</label>
                    <input className="form-input" placeholder="Agent/manager name" value={form.agentName} onChange={e => setForm({ ...form, agentName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Agent Phone</label>
                    <input className="form-input" placeholder="Agent phone" value={form.agentPhone} onChange={e => setForm({ ...form, agentPhone: e.target.value })} />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="confidential" checked={form.confidential} onChange={e => setForm({ ...form, confidential: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <label htmlFor="confidential" style={{ textTransform: 'none', fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: 0 }}>
                    <EyeOff size={14} style={{ marginRight: 4 }} /> Mark as confidential (hide address from non-coordinators)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editProfile ? 'Update' : 'Create Profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
