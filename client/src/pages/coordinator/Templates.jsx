import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Copy, Plus, Trash2, Calendar, X, FileText, CalendarDays, Clock, MapPin, Users, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

export default function Templates() {
  const { apiFetch } = useAuth();
  const [tab, setTab] = useState('day'); // 'day' | 'trip'
  const [templates, setTemplates] = useState([]);
  const [dayTemplates, setDayTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(null);
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);

  // Day template capture form
  const [showCapture, setShowCapture] = useState(false);
  const [captureDate, setCaptureDate] = useState('');
  const [captureName, setCaptureName] = useState('');
  const [captureDesc, setCaptureDesc] = useState('');
  const [capturing, setCapturing] = useState(false);

  // Apply form
  const [applyingId, setApplyingId] = useState(null);
  const [applyDate, setApplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [applying, setApplying] = useState(false);

  // Expanded entries
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/templates').then(setTemplates).catch(() => {}),
      apiFetch('/day-templates').then(setDayTemplates).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  async function createFromTemplate(templateId) {
    try {
      await apiFetch(`/templates/${templateId}/create-trip`, {
        method: 'POST',
        body: JSON.stringify({ date: createDate })
      });
      setShowCreate(null);
      alert('Trip created successfully!');
    } catch (err) { alert(err.message); }
  }

  async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;
    try {
      await apiFetch(`/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch (err) { alert(err.message); }
  }

  async function captureDay() {
    if (!captureDate || !captureName.trim()) return;
    setCapturing(true);
    try {
      const result = await apiFetch('/day-templates/capture', {
        method: 'POST',
        body: JSON.stringify({ date: captureDate, name: captureName.trim(), description: captureDesc.trim() })
      });
      setDayTemplates(prev => [result, ...prev]);
      setShowCapture(false);
      setCaptureDate('');
      setCaptureName('');
      setCaptureDesc('');
    } catch (err) { alert(err.message); }
    finally { setCapturing(false); }
  }

  async function applyDayTemplate(templateId) {
    if (!applyDate) return;
    setApplying(true);
    try {
      const result = await apiFetch(`/day-templates/${templateId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ date: applyDate })
      });
      alert(result.message);
      setApplyingId(null);
    } catch (err) { alert(err.message); }
    finally { setApplying(false); }
  }

  async function deleteDayTemplate(id) {
    if (!confirm('Delete this day template?')) return;
    try {
      await apiFetch(`/day-templates/${id}`, { method: 'DELETE' });
      setDayTemplates(prev => prev.filter(t => t._id !== id));
    } catch (err) { alert(err.message); }
  }

  if (loading) return <SkeletonPage cards={3} stats={0} />;

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Templates</h1>
        {tab === 'day' && (
          <button className="btn btn-primary" onClick={() => setShowCapture(true)}>
            <Plus size={16} /> Capture Day
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-gray-light)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[
          { id: 'day', label: 'Day Schedules', count: dayTemplates.length },
          { id: 'trip', label: 'Trip Templates', count: templates.length }
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

      {/* ═══ Day Schedules Tab ═══ */}
      {tab === 'day' && (
        <>
          {/* Capture Day Modal */}
          {showCapture && (
            <div className="card" style={{ marginBottom: 16, border: '2px solid #4f46e5' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                <CalendarDays size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Capture a Day's Schedule
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Select a date to save all its trips & rides as a reusable day template. Apply it to any future date with one click.
              </p>
              <div className="grid-2" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Source Date</label>
                  <input type="date" className="form-input" value={captureDate} onChange={e => setCaptureDate(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Template Name</label>
                  <input className="form-input" placeholder="e.g. Monday Schedule, Shoot Day 5" value={captureName} onChange={e => setCaptureName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Description (optional)</label>
                <input className="form-input" placeholder="Notes about this schedule..." value={captureDesc} onChange={e => setCaptureDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={captureDay} disabled={capturing || !captureDate || !captureName.trim()}>
                  {capturing ? 'Capturing...' : 'Capture Schedule'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowCapture(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Quick action: Same as Yesterday */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(79,70,229,0.05), rgba(5,150,105,0.05))' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>⚡ Quick: Same as Yesterday</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Capture yesterday's schedule and apply it to today instantly</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yStr = yesterday.toISOString().split('T')[0];
              const today = new Date().toISOString().split('T')[0];
              try {
                const captured = await apiFetch('/day-templates/capture', {
                  method: 'POST',
                  body: JSON.stringify({ date: yStr, name: `Yesterday's Schedule (${yStr})`, description: 'Auto-captured from yesterday' })
                });
                const result = await apiFetch(`/day-templates/${captured._id}/apply`, {
                  method: 'POST',
                  body: JSON.stringify({ date: today })
                });
                alert(result.message);
                setDayTemplates(prev => [captured, ...prev]);
              } catch (err) { alert(err.message); }
            }}>
              <Zap size={14} /> Apply Now
            </button>
          </div>

          {dayTemplates.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon"><CalendarDays size={28} /></div>
              <h3>No day schedules saved</h3>
              <p>Capture a day's complete schedule (all trips + rides) and replay it anytime with one click</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayTemplates.map(dt => (
                <div key={dt._id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{dt.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {dt.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, display: 'flex', gap: 12 }}>
                        <span>{dt.entries?.length || 0} entries</span>
                        <span>Used {dt.usageCount || 0}×</span>
                        {dt.sourceDate && <span>From {new Date(dt.sourceDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setApplyingId(applyingId === dt._id ? null : dt._id)}>
                        <Copy size={13} /> Apply
                      </button>
                      <button className="btn btn-sm" style={{ color: 'var(--color-text-secondary)' }} onClick={() => setExpandedTemplate(expandedTemplate === dt._id ? null : dt._id)}>
                        {expandedTemplate === dt._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button className="btn btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => deleteDayTemplate(dt._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Apply form */}
                  {applyingId === dt._id && (
                    <div style={{ marginTop: 10, padding: 12, background: 'var(--color-gray-light)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Apply to Date</label>
                        <input type="date" className="form-input" value={applyDate} onChange={e => setApplyDate(e.target.value)} />
                      </div>
                      <button className="btn btn-success btn-sm" onClick={() => applyDayTemplate(dt._id)} disabled={applying}>
                        <Zap size={13} /> {applying ? 'Creating...' : 'Create All'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setApplyingId(null)}>
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Expanded entries */}
                  {expandedTemplate === dt._id && dt.entries?.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Schedule Entries</div>
                      {dt.entries.map((entry, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: 13 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            background: entry.type === 'trip' ? '#dbeafe' : '#fef3c7',
                            color: entry.type === 'trip' ? '#1e40af' : '#92400e'
                          }}>
                            {entry.type.toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 600, color: '#4f46e5', minWidth: 45 }}>
                            <Clock size={11} style={{ verticalAlign: '-1px' }} /> {entry.pickupTime}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.title || `${entry.pickupLocation} → ${entry.dropoffLocation}`}
                          </span>
                          {entry.preferredDriver && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                              <Users size={10} /> {entry.preferredDriver.name || 'Driver'}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                            {entry.passengerCount}p
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Trip Templates Tab ═══ */}
      {tab === 'trip' && (
        <>
          {templates.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon"><FileText size={28} /></div>
              <h3>No trip templates yet</h3>
              <p>Save a template from any trip's detail page for quick reuse</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.map(t => (
                <div key={t._id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {t.passengers?.length || 0} passenger(s) · Used {t.usageCount} time(s)
                        {t.preferredDriver && ` · Preferred: ${t.preferredDriver.name}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(t._id)}>
                        <Copy size={13} /> Use
                      </button>
                      <button className="btn btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => deleteTemplate(t._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {showCreate === t._id && (
                    <div style={{ marginTop: 14, padding: 14, background: 'var(--color-gray-light)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label>Trip Date</label>
                        <input type="date" className="form-input" value={createDate} onChange={e => setCreateDate(e.target.value)} />
                      </div>
                      <button className="btn btn-success btn-sm" onClick={() => createFromTemplate(t._id)}>
                        <Calendar size={13} /> Create Trip
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(null)}>
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
