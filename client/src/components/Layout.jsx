import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Route, Truck, Users, Map,
  Bell, LogOut, Clapperboard, Navigation,
  BarChart3, Award, Wrench, FileText,
  MessageSquare, Settings, Moon, Sun,
  Car, Star, Bus, ClipboardList, Hand, Phone
} from 'lucide-react';
import RideRequestModal from './RideRequestModal';
import './Layout.css';

export default function Layout() {
  const { user, logout, apiFetch } = useAuth();
  const { unreadCount } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showRideRequest, setShowRideRequest] = useState(false);
  const [myDriver, setMyDriver] = useState(null);

  useEffect(() => {
    if (user?.role !== 'passenger') return;
    apiFetch('/allocations/my-driver').then(data => setMyDriver(data?.driver)).catch(() => {});
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const coordinatorLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/trips', icon: Route, label: 'Trips' },
    { to: '/ride-requests', icon: Car, label: 'Ride Requests' },
    { to: '/fleet', icon: Truck, label: 'Fleet' },
    { to: '/drivers', icon: Users, label: 'Drivers' },
    { to: '/permanent-allocations', icon: Award, label: 'Allocations' },
    { to: '/routes', icon: Bus, label: 'Routes' },
    { to: '/talent', icon: Star, label: 'Talent' },
    { to: '/map', icon: Map, label: 'Live Tracking' },
    { to: '/analytics', icon: BarChart3, label: 'Insights' },
    { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const driverLinks = [
    { to: '/my-trips', icon: Navigation, label: 'My Trips' },
    { to: '/driver-map', icon: Map, label: 'My Map' },
    { to: '/my-rides', icon: Car, label: 'My Rides' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const passengerLinks = [
    { to: '/my-trips', icon: Route, label: 'My Trips' },
    { to: '/my-rides', icon: Car, label: 'My Rides' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const links = user?.role === 'coordinator' ? coordinatorLinks
    : user?.role === 'driver' ? driverLinks
    : passengerLinks;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">
            <Clapperboard size={20} />
          </div>
          <span className="sidebar-title">TransportHQ</span>
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <link.icon size={19} strokeWidth={2} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <div className="sidebar-actions">
            <button onClick={toggleTheme} className="sidebar-action-btn" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => navigate('/settings')} className="sidebar-action-btn" title="Settings">
              <Settings size={15} />
            </button>
            <button onClick={handleLogout} className="sidebar-action-btn" title="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-greeting">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
          </div>
          <div className="topbar-right">
            <button
              className="ride-request-btn"
              onClick={() => setShowRideRequest(true)}
              title={myDriver ? "Give Call to your driver" : "Request a Ride"}
              style={myDriver ? { background: 'linear-gradient(135deg, #059669, #10b981)' } : undefined}
            >
              {myDriver ? <><Phone size={17} /><span>Give Call</span></> : <><Hand size={17} /><span>Request Ride</span></>}
            </button>
            <button className="notification-btn" onClick={() => navigate('/notifications')}>
              <Bell size={20} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      {showRideRequest && (
        <RideRequestModal onClose={() => setShowRideRequest(false)} />
      )}
    </div>
  );
}
