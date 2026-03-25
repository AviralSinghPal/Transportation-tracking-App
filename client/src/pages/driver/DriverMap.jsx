import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import GoogleMapWrapper, { Marker, Polyline, InfoWindow } from '../../components/GoogleMap';
import {
  Navigation, MapPin, Flag, User, ExternalLink,
  Radio, CircleOff, Gauge, Compass, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import './DriverMap.css';

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 10000
};

function formatSpeed(speedMs) {
  if (speedMs === null || speedMs === undefined || speedMs < 0) return 0;
  return Math.round(speedMs * 3.6); // m/s to km/h
}

function getCompassDirection(heading) {
  if (heading === null || heading === undefined) return 'N';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(heading / 45) % 8;
  return dirs[idx];
}

function getCompassRotation(heading) {
  if (heading === null || heading === undefined) return 0;
  return heading;
}

export default function DriverMap() {
  const { apiFetch, user } = useAuth();
  const { locationSharing, startLocationSharing, stopLocationSharing } = useSocket();
  const { theme } = useTheme();

  const [position, setPosition] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [assignedRides, setAssignedRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [ridesExpanded, setRidesExpanded] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [useImperial, setUseImperial] = useState(false);

  const watchIdRef = useRef(null);
  const mapRef = useRef(null);

  // Watch own GPS position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: spd, heading: hdg, accuracy: acc } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        setSpeed(spd);
        setHeading(hdg);
        setAccuracy(acc);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message);
      },
      GEOLOCATION_OPTIONS
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch ride requests assigned to this driver
  const fetchRides = useCallback(async () => {
    try {
      const data = await apiFetch('/ride-requests');
      const myRides = (data || []).filter(r =>
        r.assignedDriver === user?._id &&
        ['assigned', 'in-progress', 'driver-departed', 'arrived-pickup'].includes(r.status)
      );
      setAssignedRides(myRides);

      // Pick the active one (in-progress first, then driver-departed, then arrived-pickup, then assigned)
      const priorityOrder = ['in-progress', 'driver-departed', 'arrived-pickup', 'assigned'];
      let active = null;
      for (const status of priorityOrder) {
        active = myRides.find(r => r.status === status);
        if (active) break;
      }
      setActiveRide(active || null);
    } catch (err) {
      console.warn('Failed to fetch rides:', err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 15000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  // Auto-center map on position
  useEffect(() => {
    if (position && mapRef.current) {
      mapRef.current.panTo(position);
    }
  }, [position]);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (position) {
      map.panTo(position);
      map.setZoom(15);
    }
  }, [position]);

  // Build route path: current position -> pickup -> dropoff
  const routePath = [];
  if (activeRide && position) {
    routePath.push(position);
    if (activeRide.pickupCoords?.lat && activeRide.pickupCoords?.lng) {
      routePath.push({ lat: activeRide.pickupCoords.lat, lng: activeRide.pickupCoords.lng });
    }
    if (activeRide.dropoffCoords?.lat && activeRide.dropoffCoords?.lng) {
      routePath.push({ lat: activeRide.dropoffCoords.lat, lng: activeRide.dropoffCoords.lng });
    }
  }

  // Open in Google Maps for turn-by-turn navigation
  const openInGoogleMaps = () => {
    if (!activeRide) return;
    const destination = activeRide.dropoffAddress || activeRide.dropoff || '';
    const origin = position ? `${position.lat},${position.lng}` : '';
    const url = origin
      ? `https://www.google.com/maps/dir/${origin}/${encodeURIComponent(destination)}`
      : `https://www.google.com/maps/dir//${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  const displaySpeed = useImperial
    ? Math.round(formatSpeed(speed) * 0.621371)
    : formatSpeed(speed);
  const speedUnit = useImperial ? 'mph' : 'km/h';

  const mapCenter = position || { lat: 34.0522, lng: -118.2437 };

  return (
    <div className="driver-map-page">
      {/* Top HUD bar */}
      <div className="driver-map-hud">
        <div className="hud-section hud-speed" onClick={() => setUseImperial(!useImperial)}>
          <Gauge size={18} />
          <span className="hud-speed-value">{displaySpeed}</span>
          <span className="hud-speed-unit">{speedUnit}</span>
        </div>

        <div className="hud-section hud-compass">
          <div className="compass-wrapper" style={{ transform: `rotate(${getCompassRotation(heading)}deg)` }}>
            <Compass size={22} />
          </div>
          <span className="compass-direction">{getCompassDirection(heading)}</span>
        </div>

        <div className={`hud-section hud-location-status ${locationSharing ? 'sharing' : 'not-sharing'}`}>
          {locationSharing ? (
            <button className="location-toggle-btn active" onClick={stopLocationSharing}>
              <Radio size={14} />
              <span>Live</span>
            </button>
          ) : (
            <button className="location-toggle-btn inactive" onClick={startLocationSharing}>
              <CircleOff size={14} />
              <span>Off</span>
            </button>
          )}
        </div>

        {activeRide && (
          <button className="hud-section hud-nav-btn" onClick={openInGoogleMaps}>
            <ExternalLink size={15} />
            <span>Navigate</span>
          </button>
        )}
      </div>

      {/* Map container */}
      <div className="driver-map-container">
        {geoError && (
          <div className="driver-map-geo-error">
            <MapPin size={14} />
            <span>GPS: {geoError}</span>
          </div>
        )}

        <GoogleMapWrapper
          center={mapCenter}
          zoom={15}
          onLoad={handleMapLoad}
          darkMode={theme === 'dark'}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          {/* Driver's own position — blue pulsing dot */}
          {position && (
            <Marker
              position={position}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 10,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#1d4ed8',
                strokeWeight: 3
              }}
              title="Your position"
              onClick={() => setSelectedMarker('self')}
              zIndex={10}
            />
          )}

          {/* Pickup marker — green */}
          {activeRide?.pickupCoords?.lat && activeRide?.pickupCoords?.lng && (
            <Marker
              position={{ lat: activeRide.pickupCoords.lat, lng: activeRide.pickupCoords.lng }}
              icon={{
                path: window.google?.maps?.SymbolPath?.BACKWARD_CLOSED_ARROW || 3,
                scale: 6,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeColor: '#15803d',
                strokeWeight: 2
              }}
              title={`Pickup: ${activeRide.pickupAddress || activeRide.pickup || 'Pickup'}`}
              onClick={() => setSelectedMarker('pickup')}
              zIndex={8}
            />
          )}

          {/* Dropoff marker — red */}
          {activeRide?.dropoffCoords?.lat && activeRide?.dropoffCoords?.lng && (
            <Marker
              position={{ lat: activeRide.dropoffCoords.lat, lng: activeRide.dropoffCoords.lng }}
              icon={{
                path: window.google?.maps?.SymbolPath?.BACKWARD_CLOSED_ARROW || 3,
                scale: 6,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#b91c1c',
                strokeWeight: 2
              }}
              title={`Dropoff: ${activeRide.dropoffAddress || activeRide.dropoff || 'Dropoff'}`}
              onClick={() => setSelectedMarker('dropoff')}
              zIndex={8}
            />
          )}

          {/* Route polyline */}
          {routePath.length >= 2 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#6366f1',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                geodesic: true
              }}
            />
          )}

          {/* Info windows */}
          {selectedMarker === 'self' && position && (
            <InfoWindow position={position} onCloseClick={() => setSelectedMarker(null)}>
              <div style={{ padding: 4, fontSize: 13 }}>
                <strong>Your Location</strong>
                <div style={{ color: '#64748b', marginTop: 2 }}>
                  Accuracy: {accuracy ? `${Math.round(accuracy)}m` : 'N/A'}
                </div>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'pickup' && activeRide?.pickupCoords?.lat && (
            <InfoWindow
              position={{ lat: activeRide.pickupCoords.lat, lng: activeRide.pickupCoords.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: 4, fontSize: 13 }}>
                <strong style={{ color: '#22c55e' }}>Pickup</strong>
                <div>{activeRide.pickupAddress || activeRide.pickup || 'Pickup location'}</div>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'dropoff' && activeRide?.dropoffCoords?.lat && (
            <InfoWindow
              position={{ lat: activeRide.dropoffCoords.lat, lng: activeRide.dropoffCoords.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: 4, fontSize: 13 }}>
                <strong style={{ color: '#ef4444' }}>Dropoff</strong>
                <div>{activeRide.dropoffAddress || activeRide.dropoff || 'Dropoff location'}</div>
              </div>
            </InfoWindow>
          )}
        </GoogleMapWrapper>
      </div>

      {/* Active ride bottom card */}
      {activeRide && (
        <div className="driver-map-ride-card">
          <div className="ride-card-header">
            <div className="ride-card-status">
              <span className={`ride-status-dot status-${activeRide.status}`} />
              <span className="ride-status-text">{activeRide.status.replace(/-/g, ' ')}</span>
            </div>
            <button className="ride-card-nav-btn" onClick={openInGoogleMaps}>
              <Navigation size={14} />
              Turn-by-turn
            </button>
          </div>

          <div className="ride-card-body">
            <div className="ride-card-passenger">
              <User size={15} />
              <span>{activeRide.passengerName || activeRide.passenger?.name || 'Passenger'}</span>
            </div>

            <div className="ride-card-locations">
              <div className="ride-card-location pickup">
                <MapPin size={13} className="pickup-icon" />
                <span>{activeRide.pickupAddress || activeRide.pickup || 'Pickup'}</span>
              </div>
              <div className="ride-card-location dropoff">
                <Flag size={13} className="dropoff-icon" />
                <span>{activeRide.dropoffAddress || activeRide.dropoff || 'Dropoff'}</span>
              </div>
            </div>

            {activeRide.scheduledTime && (
              <div className="ride-card-time">
                <Clock size={13} />
                <span>{new Date(activeRide.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeRide && !loading && (
        <div className="driver-map-no-ride">
          <Navigation size={20} />
          <span>No active ride. Enjoy the drive!</span>
        </div>
      )}

      {/* All assigned rides list */}
      {assignedRides.length > 1 && (
        <div className="driver-map-rides-list">
          <button
            className="rides-list-toggle"
            onClick={() => setRidesExpanded(!ridesExpanded)}
          >
            <span>Today's Rides ({assignedRides.length})</span>
            {ridesExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {ridesExpanded && (
            <div className="rides-list-items">
              {assignedRides.map((ride) => (
                <div
                  key={ride._id}
                  className={`rides-list-item ${ride._id === activeRide?._id ? 'active' : ''}`}
                >
                  <div className="rides-list-item-status">
                    <span className={`ride-status-dot status-${ride.status}`} />
                    <span>{ride.status.replace(/-/g, ' ')}</span>
                  </div>
                  <div className="rides-list-item-info">
                    <div className="rides-list-item-passenger">
                      <User size={12} />
                      {ride.passengerName || ride.passenger?.name || 'Passenger'}
                    </div>
                    <div className="rides-list-item-route">
                      <MapPin size={11} className="pickup-icon" />
                      <span>{ride.pickupAddress || ride.pickup || 'Pickup'}</span>
                      <span className="rides-list-arrow">→</span>
                      <Flag size={11} className="dropoff-icon" />
                      <span>{ride.dropoffAddress || ride.dropoff || 'Dropoff'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
