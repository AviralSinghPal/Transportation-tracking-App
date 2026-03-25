import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Car, Navigation, MapPin, RefreshCw, AlertTriangle, FileText, Bell, CheckCheck, Hand, Bus, Star, UserCheck } from 'lucide-react';

const typeIcons = {
  'trip-assigned': Car,
  'driver-on-way': Navigation,
  'driver-arrived': MapPin,
  'trip-updated': RefreshCw,
  'delay-alert': AlertTriangle,
  'document-pending': FileText,
  'ride-request': Hand,
  'ride-assigned': UserCheck,
  'ride-eta': Car,
  'shuttle-alert': Bus,
  'talent-traveling': Star,
  'talent-arrived': Star
};

const typeColors = {
  'trip-assigned': 'var(--color-primary)',
  'driver-on-way': 'var(--color-blue)',
  'driver-arrived': 'var(--color-green)',
  'trip-updated': 'var(--color-yellow)',
  'delay-alert': 'var(--color-red)',
  'document-pending': 'var(--color-gray)',
  'ride-request': 'var(--color-primary)',
  'ride-assigned': 'var(--color-green)',
  'ride-eta': 'var(--color-blue)',
  'shuttle-alert': 'var(--color-yellow)',
  'talent-traveling': 'var(--color-yellow)',
  'talent-arrived': 'var(--color-green)'
};

export default function Notifications() {
  const { apiFetch } = useAuth();
  const { markAllRead } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Bell size={28} /></div>
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell;
            const iconColor = typeColors[n.type] || 'var(--color-gray)';
            return (
              <div
                key={n._id}
                className="card"
                style={{
                  padding: 16,
                  opacity: n.read ? 0.6 : 1,
                  borderLeft: n.read ? 'none' : `3px solid var(--color-primary)`,
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: `${iconColor}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: iconColor
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, letterSpacing: '-0.2px' }}>{n.title}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{n.message}</div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12, marginTop: 6 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
