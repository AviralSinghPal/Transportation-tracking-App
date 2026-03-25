import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/coordinator/Dashboard';
import Trips from './pages/coordinator/Trips';
import TripDetail from './pages/coordinator/TripDetail';
import Fleet from './pages/coordinator/Fleet';
import Drivers from './pages/coordinator/Drivers';
import LiveMap from './pages/coordinator/LiveMap';
import Analytics from './pages/coordinator/Analytics';
import MaintenancePage from './pages/coordinator/MaintenancePage';
import Templates from './pages/coordinator/Templates';
import PermanentAllocations from './pages/coordinator/PermanentAllocations';
import DriverMyTrips from './pages/driver/MyTrips';
import DriverMap from './pages/driver/DriverMap';
import PassengerMyTrips from './pages/passenger/MyTrips';
import TrackDriver from './pages/passenger/TrackDriver';
import MyRides from './pages/passenger/MyRides';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import RideRequests from './pages/coordinator/RideRequests';
import TalentProfiles from './pages/coordinator/TalentProfiles';
import Shuttles from './pages/coordinator/Shuttles';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'coordinator' ? '/dashboard' : '/my-trips'} /> : <Login />} />

      <Route element={<ProtectedRoute><SocketProvider><Layout /></SocketProvider></ProtectedRoute>}>
        {/* Coordinator routes */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['coordinator']}><Dashboard /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute roles={['coordinator']}><Trips /></ProtectedRoute>} />
        <Route path="/trips/:id" element={<ProtectedRoute roles={['coordinator']}><TripDetail /></ProtectedRoute>} />
        <Route path="/fleet" element={<ProtectedRoute roles={['coordinator']}><Fleet /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute roles={['coordinator']}><Drivers /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute roles={['coordinator']}><LiveMap /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['coordinator']}><Analytics /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute roles={['coordinator']}><Analytics /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute roles={['coordinator']}><MaintenancePage /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute roles={['coordinator']}><Templates /></ProtectedRoute>} />
        <Route path="/ride-requests" element={<ProtectedRoute roles={['coordinator']}><RideRequests /></ProtectedRoute>} />
        <Route path="/talent" element={<ProtectedRoute roles={['coordinator']}><TalentProfiles /></ProtectedRoute>} />
        <Route path="/routes" element={<ProtectedRoute roles={['coordinator']}><Shuttles /></ProtectedRoute>} />
        <Route path="/permanent-allocations" element={<ProtectedRoute roles={['coordinator']}><PermanentAllocations /></ProtectedRoute>} />

        {/* Driver routes */}
        <Route path="/driver-map" element={<ProtectedRoute roles={['driver']}><DriverMap /></ProtectedRoute>} />
        <Route path="/my-trips" element={
          <ProtectedRoute roles={['driver', 'passenger']}>
            {user?.role === 'driver' ? <DriverMyTrips /> : <PassengerMyTrips />}
          </ProtectedRoute>
        } />
        <Route path="/my-rides" element={<MyRides />} />

        {/* Tracking route - accessible to all authenticated users */}
        <Route path="/track/:id" element={<TrackDriver />} />

        {/* Shared routes */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
