import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import GoogleMapWrapper, { Marker, InfoWindow, Polyline, Circle, DirectionsRenderer } from '../../components/GoogleMap';
import {
  ArrowLeft, Radio, Phone, Car, MapPin, Clock, Navigation, User,
  Battery, Gauge, Shield, ChevronDown, Crosshair
} from 'lucide-react';
import '../coordinator/LiveMap.css';

// ─── Car SVG for the driver marker (encoded as data URI) ─────────────────────
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <circle cx="24" cy="24" r="22" fill="white" filter="url(#shadow)"/>
  <circle cx="24" cy="24" r="19" fill="#059669"/>
  <g transform="translate(12,10)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L20 8l-2-4H6L4 8l-2.5 1.1C.7 9.3 0 10.1 0 11v3c0 .6.4 1 1 1h2"/>
    <circle cx="5" cy="15" r="2.5"/>
    <circle cx="19" cy="15" r="2.5"/>
    <path d="M5 8h14"/>
  </g>
</svg>`;

const CAR_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_SVG)}`;

// ─── Helper: compute bearing between two lat/lng points ──────────────────────
function computeHeading(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ─── Helper: haversine distance in meters ────────────────────────────────────
function haversineDistance(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── Ease-out cubic ──────────────────────────────────────────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function TrackDriver() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { apiFetch } = useAuth();

  // ── State ────────────────────────────────────────────────────────────────
  const [rideRequest, setRideRequest] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eta, setEta] = useState(null);
  const [trail, setTrail] = useState([]);
  const [driverInfoOpen, setDriverInfoOpen] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [driverHeading, setDriverHeading] = useState(0);
  const [showDriverInfo, setShowDriverInfo] = useState(false);
  const [directions, setDirections] = useState(null);
  const [totalDistance, setTotalDistance] = useState(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const animatedPos = useRef(null);
  const animFrameRef = useRef(null);
  const prevLocRef = useRef(null);
  const userPannedRef = useRef(false);
  const autoCenterTimeoutRef = useRef(null);

  // ── Fetch ride request ───────────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/ride-requests/${id}`)
      .then((data) => {
        setRideRequest(data);
        if (data.assignedDriver?.lastLocation) {
          const loc = data.assignedDriver.lastLocation;
          const pos = { lat: loc.lat, lng: loc.lng };
          setDriverLocation({ ...pos, speed: loc.speed || 0, heading: loc.heading || 0, battery: loc.battery, timestamp: loc.updatedAt });
          animatedPos.current = pos;
          prevLocRef.current = pos;
        }
        // Pre-compute total distance from pickup to dropoff for progress bar
        if (data.pickupCoordinates && data.dropoffCoordinates) {
          const pickup = { lat: data.pickupCoordinates.lat, lng: data.pickupCoordinates.lng };
          const dropoff = { lat: data.dropoffCoordinates.lat, lng: data.dropoffCoordinates.lng };
          setTotalDistance(haversineDistance(pickup, dropoff));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Socket: live location + ETA ──────────────────────────────────────────
  useEffect(() => {
    if (!socket || !rideRequest?.assignedDriver) return;

    const driverId = rideRequest.assignedDriver._id || rideRequest.assignedDriver;
    socket.emit('track:driver', driverId);

    const handleLocationUpdate = (data) => {
      if (data.driverId !== driverId) return;

      const newPos = { lat: data.lat, lng: data.lng };
      const prev = prevLocRef.current;

      // Compute heading from previous position
      if (prev && (prev.lat !== newPos.lat || prev.lng !== newPos.lng)) {
        setDriverHeading(data.heading || computeHeading(prev, newPos));
      }

      // Accumulate trail
      setTrail((t) => {
        const last = t[t.length - 1];
        if (!last || haversineDistance(last, newPos) > 10) {
          return [...t, newPos];
        }
        return t;
      });

      // Smooth animation from current animated position to new position (4s ease-out)
      const startPos = animatedPos.current || prev || newPos;
      const startTime = performance.now();
      const duration = 4000;

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      function animate(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = easeOutCubic(t);
        const lat = startPos.lat + (newPos.lat - startPos.lat) * ease;
        const lng = startPos.lng + (newPos.lng - startPos.lng) * ease;
        animatedPos.current = { lat, lng };

        setDriverLocation({
          lat,
          lng,
          speed: data.speed || 0,
          heading: data.heading || 0,
          battery: data.battery,
          timestamp: data.timestamp || new Date().toISOString()
        });

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
      prevLocRef.current = newPos;
    };

    const handleEtaUpdate = (data) => {
      if (data.rideId === id || data.rideId === rideRequest._id) {
        setEta(data);
      }
    };

    socket.on('driver:location-update', handleLocationUpdate);
    socket.on('ride:eta-update', handleEtaUpdate);

    return () => {
      socket.emit('track:driver:stop', driverId);
      socket.off('driver:location-update', handleLocationUpdate);
      socket.off('ride:eta-update', handleEtaUpdate);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [socket, rideRequest, id]);

  // ── Auto-recenter on driver ──────────────────────────────────────────────
  useEffect(() => {
    if (!autoCenter || !driverLocation || !mapRef.current) return;
    mapRef.current.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
  }, [driverLocation?.lat, driverLocation?.lng, autoCenter]);

  // ── Fetch directions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!driverLocation || !rideRequest) return;
    if (!window.google?.maps?.DirectionsService) return;

    const isPickedUp = rideRequest.status === 'in-progress';
    const destination = isPickedUp
      ? rideRequest.dropoffCoordinates
      : rideRequest.pickupCoordinates;

    if (!destination) return;

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: driverLocation.lat, lng: driverLocation.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );
  }, [
    // Only re-fetch directions every ~15s worth of position changes
    driverLocation && Math.round(driverLocation.lat * 1000),
    driverLocation && Math.round(driverLocation.lng * 1000),
    rideRequest?.status
  ]);

  // ── Map load handler ─────────────────────────────────────────────────────
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;

    // Detect user panning to disable auto-center temporarily
    map.addListener('dragstart', () => {
      userPannedRef.current = true;
      setAutoCenter(false);
      if (autoCenterTimeoutRef.current) clearTimeout(autoCenterTimeoutRef.current);
      // Re-enable auto-center after 15s of no panning
      autoCenterTimeoutRef.current = setTimeout(() => {
        setAutoCenter(true);
        userPannedRef.current = false;
      }, 15000);
    });

    // Fit bounds to show driver, pickup, dropoff
    if (rideRequest) {
      const bounds = new window.google.maps.LatLngBounds();
      if (driverLocation) bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lng });
      if (rideRequest.pickupCoordinates) bounds.extend(rideRequest.pickupCoordinates);
      if (rideRequest.dropoffCoordinates) bounds.extend(rideRequest.dropoffCoordinates);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 80, bottom: 280, left: 40, right: 40 });
      }
    }
  }, [rideRequest, driverLocation]);

  // ── Derived values ───────────────────────────────────────────────────────
  const driver = rideRequest?.assignedDriver;
  const isActive = rideRequest && ['assigned', 'in-progress'].includes(rideRequest.status);
  const isPickedUp = rideRequest?.status === 'in-progress';

  const mapCenter = useMemo(() => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (rideRequest?.pickupCoordinates) return rideRequest.pickupCoordinates;
    return { lat: 34.0522, lng: -118.2437 };
  }, [driverLocation, rideRequest]);

  // Progress bar: estimate % of trip completed
  const progressPercent = useMemo(() => {
    if (!isPickedUp || !rideRequest?.pickupCoordinates || !rideRequest?.dropoffCoordinates || !driverLocation) return 0;
    const pickup = rideRequest.pickupCoordinates;
    const dropoff = rideRequest.dropoffCoordinates;
    const total = totalDistance || haversineDistance(pickup, dropoff);
    if (total <= 0) return 0;
    const remaining = haversineDistance({ lat: driverLocation.lat, lng: driverLocation.lng }, dropoff);
    const pct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
    return Math.round(pct);
  }, [driverLocation, rideRequest, isPickedUp, totalDistance]);

  // ETA minutes
  const etaMinutes = useMemo(() => {
    if (eta?.eta) return Math.round(eta.eta);
    if (rideRequest?.eta) return Math.round(rideRequest.eta);
    return null;
  }, [eta, rideRequest]);

  // Speed in mph
  const speedMph = useMemo(() => {
    if (driverLocation?.speed > 0) return Math.round(driverLocation.speed * 2.237);
    return 0;
  }, [driverLocation?.speed]);

  // Fallback polyline (straight line) when directions are not available
  const fallbackPolylinePath = useMemo(() => {
    if (directions || !driverLocation || !rideRequest) return null;
    const dest = isPickedUp ? rideRequest.dropoffCoordinates : rideRequest.pickupCoordinates;
    if (!dest) return null;
    return [
      { lat: driverLocation.lat, lng: driverLocation.lng },
      { lat: dest.lat, lng: dest.lng }
    ];
  }, [directions, driverLocation, rideRequest, isPickedUp]);

  // ── Recenter button handler ──────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    setAutoCenter(true);
    userPannedRef.current = false;
    if (autoCenterTimeoutRef.current) clearTimeout(autoCenterTimeoutRef.current);
    if (mapRef.current && driverLocation) {
      mapRef.current.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
      mapRef.current.setZoom(15);
    }
  }, [driverLocation]);

  // ── Rotated car icon ─────────────────────────────────────────────────────
  const carIcon = useMemo(() => {
    if (!window.google) return null;
    return {
      url: CAR_ICON_URL,
      scaledSize: new window.google.maps.Size(48, 48),
      anchor: new window.google.maps.Point(24, 24),
      rotation: driverHeading
    };
  }, [driverHeading]);

  // ── Pickup icon ──────────────────────────────────────────────────────────
  const pickupIcon = useMemo(() => {
    if (!window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 14,
      fillColor: '#16a34a',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3
    };
  }, []);

  // ── Dropoff icon ─────────────────────────────────────────────────────────
  const dropoffIcon = useMemo(() => {
    if (!window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 14,
      fillColor: '#dc2626',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3
    };
  }, []);

  // ── Loading / Error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !rideRequest) {
    return (
      <div className="page" style={{ maxWidth: 500 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-rides')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <h3>Ride not found</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>{error || 'This ride request does not exist.'}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="page" style={{ padding: 0, height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

        {/* ── ETA Card (top of map) ─────────────────────────────────────── */}
        {isActive && etaMinutes !== null && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, background: 'white', borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)', padding: '12px 24px',
            textAlign: 'center', minWidth: 200
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 2 }}>
              {isPickedUp ? 'Arriving at destination' : 'Driver arriving'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
              {etaMinutes} <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>min</span>
            </div>
            {eta?.distanceText && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{eta.distanceText} away</div>
            )}
          </div>
        )}

        {/* ── Live Tracking indicator ───────────────────────────────────── */}
        {driverLocation && isActive && (
          <div style={{
            position: 'absolute', top: 14, left: 14, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', background: 'white', borderRadius: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
              display: 'inline-block', animation: 'pulse-ring 2s infinite'
            }} />
            Live Tracking
          </div>
        )}

        {/* ── Recenter button ───────────────────────────────────────────── */}
        {!autoCenter && driverLocation && (
          <button
            onClick={handleRecenter}
            style={{
              position: 'absolute', top: 14, right: 14, zIndex: 10,
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Re-center on driver"
          >
            <Crosshair size={18} color="#4f46e5" />
          </button>
        )}

        {/* ── Back button (top-left, below live indicator) ───────────────── */}
        <button
          onClick={() => navigate('/my-rides')}
          style={{
            position: 'absolute', top: driverLocation && isActive ? 52 : 14, left: 14, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '8px 14px', background: 'white', borderRadius: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer', color: '#334155'
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* ── Progress bar ──────────────────────────────────────────────── */}
        {isPickedUp && (
          <div style={{
            position: 'absolute', bottom: driverInfoOpen ? 'calc(40vh + 4px)' : 56, left: 0, right: 0,
            zIndex: 10, height: 4, background: 'rgba(0,0,0,0.08)', transition: 'bottom 0.3s ease'
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)',
              width: `${progressPercent}%`, borderRadius: '0 2px 2px 0',
              transition: 'width 1s ease-out'
            }} />
          </div>
        )}

        {/* ── Google Map ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
          <GoogleMapWrapper
            center={mapCenter}
            zoom={14}
            onLoad={handleMapLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: 'greedy'
            }}
          >
            {/* Driver marker */}
            {driverLocation && carIcon && (
              <Marker
                position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
                icon={carIcon}
                zIndex={1000}
                onClick={() => setShowDriverInfo(!showDriverInfo)}
              />
            )}

            {/* Driver accuracy circle */}
            {driverLocation && (
              <Circle
                center={{ lat: driverLocation.lat, lng: driverLocation.lng }}
                radius={60}
                options={{
                  fillColor: '#059669',
                  fillOpacity: 0.06,
                  strokeColor: '#059669',
                  strokeOpacity: 0.2,
                  strokeWeight: 1
                }}
              />
            )}

            {/* Driver InfoWindow */}
            {showDriverInfo && driverLocation && (
              <InfoWindow
                position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
                onCloseClick={() => setShowDriverInfo(false)}
                options={{ pixelOffset: new window.google.maps.Size(0, -28) }}
              >
                <div style={{ padding: '4px 2px', minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{driver?.name || 'Your Driver'}</div>
                  {speedMph > 0 && <div style={{ fontSize: 12, color: '#666' }}>{speedMph} mph</div>}
                  {driverLocation.timestamp && (
                    <div style={{ fontSize: 11, color: '#999' }}>
                      Updated {new Date(driverLocation.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Pickup marker */}
            {rideRequest.pickupCoordinates && pickupIcon && (
              <Marker
                position={rideRequest.pickupCoordinates}
                icon={pickupIcon}
                label={{
                  text: 'P',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12px'
                }}
                zIndex={900}
              />
            )}

            {/* Dropoff marker */}
            {rideRequest.dropoffCoordinates && dropoffIcon && (
              <Marker
                position={rideRequest.dropoffCoordinates}
                icon={dropoffIcon}
                label={{
                  text: 'D',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12px'
                }}
                zIndex={900}
              />
            )}

            {/* Directions route (Google API) */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#4f46e5',
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                  }
                }}
              />
            )}

            {/* Fallback straight-line polyline when no directions */}
            {fallbackPolylinePath && (
              <Polyline
                path={fallbackPolylinePath}
                options={{
                  strokeColor: '#4f46e5',
                  strokeWeight: 4,
                  strokeOpacity: 0.6,
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '16px'
                  }]
                }}
              />
            )}

            {/* Trail line: path driver has taken */}
            {trail.length > 1 && (
              <Polyline
                path={trail}
                options={{
                  strokeColor: '#059669',
                  strokeWeight: 3,
                  strokeOpacity: 0.3
                }}
              />
            )}
          </GoogleMapWrapper>

          {/* Waiting overlay when no location yet */}
          {!driverLocation && isActive && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 10, padding: '20px 28px', background: 'white', borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)', textAlign: 'center', maxWidth: 280
            }}>
              <Navigation size={28} color="#6366f1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Waiting for driver location</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Your driver's location will appear here once they start sharing</div>
            </div>
          )}
        </div>

        {/* ── Driver Info Bottom Sheet ──────────────────────────────────── */}
        <div
          style={{
            background: 'var(--color-surface, #ffffff)',
            borderTop: '1px solid var(--color-border, #e5e7eb)',
            maxHeight: driverInfoOpen ? '40vh' : 56,
            overflowY: driverInfoOpen ? 'auto' : 'hidden',
            transition: 'max-height 0.3s ease',
            position: 'relative',
            flexShrink: 0
          }}
        >
          {/* Sheet drag handle / collapse toggle */}
          <button
            onClick={() => setDriverInfoOpen(!driverInfoOpen)}
            style={{
              width: '100%', border: 'none', background: 'none', cursor: 'pointer',
              padding: '10px 20px 8px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Mini handle bar */}
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: 'var(--color-border, #d1d5db)'
              }} />
            </div>
            <ChevronDown
              size={18}
              color="#94a3b8"
              style={{
                transform: driverInfoOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s'
              }}
            />
          </button>

          <div style={{ padding: '0 20px 20px' }}>
            {/* Driver header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {driver?.avatar ? (
                    <img src={driver.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
                    {driver?.name || 'Pending'}
                  </div>
                  {rideRequest.assignedVehicle && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #64748b)', marginTop: 2 }}>
                      {rideRequest.assignedVehicle.name} &middot; {rideRequest.assignedVehicle.licensePlate}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Status badge */}
                <span style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                  background: rideRequest.status === 'in-progress' ? 'rgba(5,150,105,0.1)' : 'rgba(79,70,229,0.1)',
                  color: rideRequest.status === 'in-progress' ? '#059669' : '#4f46e5'
                }}>
                  {rideRequest.status === 'assigned' ? 'Assigned' : rideRequest.status === 'in-progress' ? 'In Progress' : rideRequest.status}
                </span>
              </div>
            </div>

            {/* Call button */}
            {driver?.phone && (
              <a
                href={`tel:${driver.phone}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 16px', background: '#4f46e5', color: 'white',
                  borderRadius: 12, marginBottom: 14, textDecoration: 'none',
                  fontSize: 14, fontWeight: 600
                }}
              >
                <Phone size={16} /> Call {driver.name?.split(' ')[0] || 'Driver'}
              </a>
            )}

            {/* Locations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', background: 'var(--color-gray-light, #f8fafc)',
                borderRadius: 10, fontSize: 13
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1
                }}>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>P</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pickup</div>
                  <div style={{ fontWeight: 500 }}>{rideRequest.pickupLocation}</div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', background: 'var(--color-gray-light, #f8fafc)',
                borderRadius: 10, fontSize: 13
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: '#dc2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1
                }}>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>D</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Drop-off</div>
                  <div style={{ fontWeight: 500 }}>{rideRequest.dropoffLocation}</div>
                </div>
              </div>
            </div>

            {/* Stats row: ETA, Speed, Battery */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* ETA */}
              {etaMinutes !== null && (
                <div style={{
                  flex: 1, padding: '10px 12px', background: 'rgba(79,70,229,0.06)',
                  borderRadius: 10, textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                    <Clock size={13} color="#4f46e5" />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>ETA</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>
                    {etaMinutes}<span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}> min</span>
                  </div>
                  {eta?.distanceText && (
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{eta.distanceText}</div>
                  )}
                </div>
              )}

              {/* Speed */}
              <div style={{
                flex: 1, padding: '10px 12px', background: 'var(--color-gray-light, #f8fafc)',
                borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                  <Gauge size={13} color="#64748b" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Speed</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#334155' }}>
                  {speedMph}<span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}> mph</span>
                </div>
              </div>

              {/* Battery (shown if available) */}
              {driverLocation?.battery != null && (
                <div style={{
                  flex: 1, padding: '10px 12px', background: 'var(--color-gray-light, #f8fafc)',
                  borderRadius: 10, textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                    <Battery size={13} color={driverLocation.battery < 20 ? '#dc2626' : '#64748b'} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Battery</span>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 800,
                    color: driverLocation.battery < 20 ? '#dc2626' : '#334155'
                  }}>
                    {Math.round(driverLocation.battery)}<span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar detail (when in progress) */}
            {isPickedUp && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Trip Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>{progressPercent}%</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)',
                    width: `${progressPercent}%`, borderRadius: 3,
                    transition: 'width 1s ease-out'
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
