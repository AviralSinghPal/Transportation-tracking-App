import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, User, Shield, Bell, Palette, Info } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <h1 className="page-title">Settings</h1>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user?.email}</div>
            <div className="badge badge-blue" style={{ marginTop: 4 }}><span className="badge-dot" />{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} /> Appearance
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Switch between light and dark theme</div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              width: 52, height: 28, borderRadius: 14, padding: 2,
              background: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-border)',
              display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 12, background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)',
              transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}>
              {theme === 'dark' ? <Moon size={12} color="#4f46e5" /> : <Sun size={12} color="#d97706" />}
            </div>
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} /> Notifications
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Trip assignments', 'Driver updates', 'Status changes', 'Maintenance alerts'].map(label => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>{label}</span>
              <span className="badge badge-green"><span className="badge-dot" />Enabled</span>
            </div>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={16} /> About
        </h3>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
          <div><strong>App:</strong> TransportHQ v2.0</div>
          <div><strong>Platform:</strong> Progressive Web App</div>
          <div><strong>Purpose:</strong> Film Production Transportation Management</div>
        </div>
      </div>
    </div>
  );
}
