import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import GoogleMapWrapper, { Marker, InfoWindow, Polyline, Circle, TrafficLayer, DirectionsRenderer } from '../../components/GoogleMap';
import {
  Radio, Navigation, Users, Clock, MapPin, Crosshair, Maximize2,
  Layers, PlusCircle, Car, WifiOff, Route, AlertTriangle
} from 'lucide-react';
import './LiveMap.css';

// ─── Constants ──────────────────────────────────────────────────────────────
const LA_CENTER = { lat: 34.0522, lng: -118.2437 };
const DEFAULT_ZOOM = 12;
const SIGNAL_LOST_THRESHOLD_MS = 60000;
const MARKER_ANIM_DURATION = 4000;
const TOAST_DURATION = 4000;
const TRAIL_MINUTES = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeSince(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (secs < 10) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function driverStatus(driver) {
  if (driver.offlineType === 'offline' || driver.offlineType === 'signal-lost') return 'signal-lost';
  const elapsed = Date.now() - new Date(driver.timestamp).getTime();
  if (elapsed > SIGNAL_LOST_THRESHOLD_MS) return 'signal-lost';
  if (driver.speed > 0) return 'moving';
  return 'idle';
}

function driverMarkerColor(status) {
  if (status === 'moving') return '#059669';
  if (status === 'idle') return '#3b82f6';
  return '#f97316';
}

function createMarkerIcon(initial, status) {
  const color = driverMarkerColor(status);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="800" font-family="system-ui,sans-serif">${initial || 'D'}</text>
    </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: typeof window !== 'undefined' && window.google
      ? new window.google.maps.Size(40, 40)
      : { width: 40, height: 40 },
    anchor: typeof window !== 'undefined' && window.google
      ? new window.google.maps.Point(20, 20)
      : { x: 20, y: 20 },
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LiveMap() {
  const { socket } = useSocket();
  const { apiFetch } = useAuth();

  // Map ref
  const mapRef = useRef(null);

  // Core state
  const [driverLocations, setDriverLocations] = useState({});
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [geofences, setGeofences] = useState([]);

  // UI state
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [autoFollow, setAutoFollow] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [panelTab, setPanelTab] = useState('drivers');
  const [infoWindowId, setInfoWindowId] = useState(null);

  // Geofence creation
  const [addingZone, setAddingZone] = useState(false);
  const [pendingZoneCenter, setPendingZoneCenter] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneRadius, setZoneRadius] = useState(500);

  // Driver trail
  const [driverTrail, setDriverTrail] = useState([]);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Smooth animation refs
  const animatedPositions = useRef({});
  const animFrameRef = useRef(null);

  // ─── Toast helper ───────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  // ─── Initial data fetches ──────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    apiFetch(`/trips?date=${today}`)
      .then(trips => setActiveTrips(trips.filter(t => !['completed', 'cancelled', 'unassigned'].includes(t.status))))
      .catch(() => {});

    apiFetch('/ride-requests')
      .then(rides => setActiveRides(rides))
      .catch(() => {});

    apiFetch('/geofences')
      .then(data => setGeofences(Array.isArray(data) ? data.filter(g => g.active !== false) : []))
      .catch(() => {});
  }, [apiFetch]);

  // ─── Socket: driver location updates ───────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    function handleLocationUpdate(data) {
      setDriverLocations(prev => {
        const existing = prev[data.driverId];
        return {
          ...prev,
          [data.driverId]: {
            ...data,
            offlineType: null,
            prevLat: existing?.lat,
            prevLng: existing?.lng,
          }
        };
      });
    }

    function handleOffline(data) {
      setDriverLocations(prev => {
        const existing = prev[data.driverId];
        if (!existing) return prev;
        return {
          ...prev,
          [data.driverId]: {
            ...existing,
            offlineType: data.type,
          }
        };
      });
      const driver = driverLocationsRef.current[data.driverId];
      const name = driver?.name || 'Driver';
      if (data.type === 'offline') {
        addToast(`${name} went offline`, 'warning');
      } else {
        addToast(`${name} signal lost`, 'warning');
      }
    }

    function handleGeofenceTrigger(data) {
      const action = data.type === 'enter' ? 'entered' : 'exited';
      addToast(`${data.driverName} ${action} ${data.geofenceName}`, 'info');
    }

    function handleRideNew() {
      apiFetch('/ride-requests')
        .then(rides => setActiveRides(rides))
        .catch(() => {});
    }

    function handleRideUpdated() {
      apiFetch('/ride-requests')
        .then(rides => setActiveRides(rides))
        .catch(() => {});
    }

    socket.on('driver:location-update', handleLocationUpdate);
    socket.on('driver:offline', handleOffline);
    socket.on('geofence:trigger', handleGeofenceTrigger);
    socket.on('rideRequest:new', handleRideNew);
    socket.on('rideRequest:updated', handleRideUpdated);

    return () => {
      socket.off('driver:location-update', handleLocationUpdate);
      socket.off('driver:offline', handleOffline);
      socket.off('geofence:trigger', handleGeofenceTrigger);
      socket.off('rideRequest:new', handleRideNew);
      socket.off('rideRequest:updated', handleRideUpdated);
    };
  }, [socket, apiFetch, addToast]);

  // Keep a ref to driverLocations for use in socket callbacks
  const driverLocationsRef = useRef(driverLocations);
  useEffect(() => { driverLocationsRef.current = driverLocations; }, [driverLocations]);

  // ─── Smooth marker animation ──────────────────────────────────────────
  useEffect(() => {
    const entries = Object.values(driverLocations);
    entries.forEach(d => {
      if (d.prevLat != null && d.prevLng != null &&
          (Math.abs(d.prevLat - d.lat) > 0.000001 || Math.abs(d.prevLng - d.lng) > 0.000001)) {
        animatedPositions.current[d.driverId] = {
          startLat: d.prevLat,
          startLng: d.prevLng,
          endLat: d.lat,
          endLng: d.lng,
          startTime: performance.now(),
        };
      } else if (!animatedPositions.current[d.driverId]) {
        animatedPositions.current[d.driverId] = {
          currentLat: d.lat,
          currentLng: d.lng,
          done: true,
        };
      }
    });
  }, [driverLocations]);

  const [interpolatedPositions, setInterpolatedPositions] = useState({});

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;
      const now = performance.now();
      const updated = {};
      let anyAnimating = false;

      for (const [id, anim] of Object.entries(animatedPositions.current)) {
        if (anim.done) {
          updated[id] = { lat: anim.currentLat, lng: anim.currentLng };
          continue;
        }
        const elapsed = now - anim.startTime;
        const t = Math.min(elapsed / MARKER_ANIM_DURATION, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const lat = anim.startLat + (anim.endLat - anim.startLat) * ease;
        const lng = anim.startLng + (anim.endLng - anim.startLng) * ease;
        updated[id] = { lat, lng };
        if (t >= 1) {
          anim.done = true;
          anim.currentLat = anim.endLat;
          anim.currentLng = anim.endLng;
        } else {
          anyAnimating = true;
        }
      }

      setInterpolatedPositions(updated);
      if (anyAnimating) {
        animFrameRef.current = window.requestAnimationFrame(tick);
      }
    }

    animFrameRef.current = window.requestAnimationFrame(tick);

    // Re-run tick whenever driverLocations change to pick up new animations
    const interval = setInterval(() => {
      if (!running) return;
      let anyAnimating = false;
      for (const anim of Object.values(animatedPositions.current)) {
        if (!anim.done) { anyAnimating = true; break; }
      }
      if (anyAnimating && !animFrameRef.current) {
        animFrameRef.current = window.requestAnimationFrame(tick);
      }
    }, 200);

    return () => {
      running = false;
      if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
      clearInterval(interval);
    };
  }, [driverLocations]);

  // ─── Auto-follow selected driver ──────────────────────────────────────
  useEffect(() => {
    if (!autoFollow || !selectedDriver || !mapRef.current) return;
    const pos = interpolatedPositions[selectedDriver];
    if (pos) {
      mapRef.current.panTo(pos);
    }
  }, [autoFollow, selectedDriver, interpolatedPositions]);

  // ─── Driver trail ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDriver) {
      setDriverTrail([]);
      return;
    }
    const from = new Date(Date.now() - TRAIL_MINUTES * 60 * 1000).toISOString();
    apiFetch(`/tracking/${selectedDriver}/history?from=${from}`)
      .then(data => {
        if (Array.isArray(data)) {
          setDriverTrail(data.map(p => ({ lat: p.lat, lng: p.lng })));
        } else {
          setDriverTrail([]);
        }
      })
      .catch(() => setDriverTrail([]));
  }, [selectedDriver, apiFetch]);

  // ─── Derived data ─────────────────────────────────────────────────────
  const driverList = useMemo(() => Object.values(driverLocations), [driverLocations]);

  const filteredRides = useMemo(() =>
    activeRides.filter(r => ['pending', 'assigned', 'in-progress'].includes(r.status)),
    [activeRides]
  );

  const offlineCount = useMemo(() =>
    driverList.filter(d => driverStatus(d) === 'signal-lost').length,
    [driverList]
  );

  // Nearby driver suggestions for a selected pending ride
  const nearbyDrivers = useMemo(() => {
    if (!selectedRide || selectedRide.status !== 'pending') return [];
    const pickup = selectedRide.pickupCoordinates || selectedRide.pickupLocation;
    if (!pickup) return [];

    let pLat, pLng;
    if (typeof pickup === 'object' && pickup.lat != null) {
      pLat = pickup.lat;
      pLng = pickup.lng || pickup.lon;
    } else if (typeof pickup === 'object' && pickup.coordinates) {
      pLng = pickup.coordinates[0];
      pLat = pickup.coordinates[1];
    } else {
      return [];
    }

    const available = driverList
      .filter(d => driverStatus(d) !== 'signal-lost')
      .map(d => ({
        ...d,
        distance: haversineDistance(pLat, pLng, d.lat, d.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    return available.slice(0, 3).map(d => d.driverId);
  }, [selectedRide, driverList]);

  // ─── Map interaction handlers ─────────────────────────────────────────
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback((e) => {
    if (!addingZone) {
      setInfoWindowId(null);
      return;
    }
    setPendingZoneCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, [addingZone]);

  function fitAllDrivers() {
    if (driverList.length === 0 || !mapRef.current) return;
    const bounds = new window.google.maps.LatLngBounds();
    driverList.forEach(d => bounds.extend({ lat: d.lat, lng: d.lng }));
    mapRef.current.fitBounds(bounds, 50);
    setSelectedDriver(null);
    setSelectedRide(null);
    setAutoFollow(false);
  }

  function focusDriver(driverId) {
    setSelectedDriver(driverId);
    setSelectedRide(null);
    const d = driverLocations[driverId];
    if (d && mapRef.current) {
      mapRef.current.panTo({ lat: d.lat, lng: d.lng });
      mapRef.current.setZoom(15);
    }
  }

  // Geocode cache to avoid repeated lookups
  const geocodeCacheRef = useRef({});

  async function geocodeAddress(address) {
    if (!address || typeof address !== 'string') return null;
    if (geocodeCacheRef.current[address]) return geocodeCacheRef.current[address];
    if (!window.google?.maps?.Geocoder) return null;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: address + ', Los Angeles, CA' }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            reject(new Error(status));
          }
        });
      });
      geocodeCacheRef.current[address] = result;
      return result;
    } catch {
      return null;
    }
  }

  async function focusRide(ride) {
    setSelectedRide(ride);
    setSelectedDriver(null);
    if (!mapRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Try explicit coordinates first, then geocode text addresses
    const tryExtend = (loc) => {
      if (!loc) return;
      if (typeof loc === 'object' && loc.lat != null) {
        bounds.extend({ lat: loc.lat, lng: loc.lng || loc.lon });
        hasPoints = true;
      }
    };

    tryExtend(ride.pickupCoordinates);
    tryExtend(ride.dropoffCoordinates);

    // If no coordinates, geocode the text addresses
    if (!hasPoints) {
      const [pickupCoord, dropoffCoord] = await Promise.all([
        geocodeAddress(ride.pickupLocation),
        geocodeAddress(ride.dropoffLocation)
      ]);

      if (pickupCoord) {
        bounds.extend(pickupCoord);
        hasPoints = true;
        ride._pickupCoord = pickupCoord; // cache on the ride object
      }
      if (dropoffCoord) {
        bounds.extend(dropoffCoord);
        hasPoints = true;
        ride._dropoffCoord = dropoffCoord;
      }

      // Geocode stops too
      const stopsWithCoords = await Promise.all(
        (ride.stops || []).map(async (stop) => {
          const coord = await geocodeAddress(stop.location);
          return { ...stop, _coord: coord };
        })
      );

      // Update selectedRide with coords so markers/directions can render
      if (pickupCoord || dropoffCoord) {
        setSelectedRide({ ...ride, _pickupCoord: pickupCoord, _dropoffCoord: dropoffCoord, stops: stopsWithCoords });
      }
    }

    if (hasPoints) {
      mapRef.current.fitBounds(bounds, 80);
    } else {
      addToast('Could not locate ride addresses on map', 'warning');
    }
  }

  function getDriverRide(driverId) {
    return activeRides.find(r =>
      (r.assignedDriver?._id || r.assignedDriver) === driverId
    );
  }

  // ─── Geofence creation ────────────────────────────────────────────────
  async function saveGeofence() {
    if (!pendingZoneCenter || !zoneName.trim()) return;
    try {
      const newFence = await apiFetch('/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoneName.trim(),
          center: pendingZoneCenter,
          radius: Number(zoneRadius) || 500,
          type: 'circle',
          active: true,
        }),
      });
      setGeofences(prev => [...prev, newFence]);
      addToast(`Zone "${zoneName.trim()}" created`, 'success');
    } catch (err) {
      addToast('Failed to create zone', 'error');
    }
    cancelZoneCreation();
  }

  function cancelZoneCreation() {
    setAddingZone(false);
    setPendingZoneCenter(null);
    setZoneName('');
    setZoneRadius(500);
  }

  // ─── Directions route for selected ride ──────────────────────────────
  const [directionsResult, setDirectionsResult] = useState(null);

  useEffect(() => {
    if (!selectedRide) { setDirectionsResult(null); return; }

    const pickup = selectedRide._pickupCoord;
    const dropoff = selectedRide._dropoffCoord;
    if (!pickup || !dropoff) { setDirectionsResult(null); return; }
    if (!window.google?.maps?.DirectionsService) { setDirectionsResult(null); return; }

    // Build waypoints from stops (if any)
    const waypoints = (selectedRide.stops || [])
      .filter(s => s._coord)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => ({ location: s._coord, stopover: true }));

    const service = new window.google.maps.DirectionsService();
    service.route({
      origin: pickup,
      destination: dropoff,
      waypoints,
      optimizeWaypoints: false,
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') {
        setDirectionsResult(result);
      } else {
        setDirectionsResult(null);
      }
    });
  }, [selectedRide?._id, selectedRide?._pickupCoord, selectedRide?._dropoffCoord]);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ padding: 0, height: 'calc(100vh - 80px)' }}>
      <div className="livemap-container">
        {/* ── Map Area ── */}
        <div className="livemap-map">
          <GoogleMapWrapper
            center={LA_CENTER}
            zoom={DEFAULT_ZOOM}
            onLoad={handleMapLoad}
            onClick={handleMapClick}
          >
            {/* Traffic Layer */}
            {showTraffic && <TrafficLayer />}

            {/* Driver Markers */}
            {driverList.map(d => {
              const status = driverStatus(d);
              const pos = interpolatedPositions[d.driverId] || { lat: d.lat, lng: d.lng };
              const isNearby = nearbyDrivers.includes(d.driverId);

              return (
                <Marker
                  key={d.driverId}
                  position={pos}
                  icon={createMarkerIcon(d.name?.charAt(0), status)}
                  label={isNearby ? {
                    text: '\u2605',
                    color: '#f59e0b',
                    fontSize: '10px',
                    className: 'livemap-nearby-star',
                  } : undefined}
                  onClick={() => {
                    setInfoWindowId(d.driverId);
                    setSelectedDriver(d.driverId);
                  }}
                  zIndex={selectedDriver === d.driverId ? 999 : isNearby ? 998 : 1}
                >
                  {infoWindowId === d.driverId && (
                    <InfoWindow onCloseClick={() => setInfoWindowId(null)}>
                      <div style={{ minWidth: 180, fontFamily: 'system-ui, sans-serif' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {timeSince(d.timestamp)}
                        </div>
                        {d.speed > 0 && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            {(d.speed * 2.237).toFixed(0)} mph
                          </div>
                        )}
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          <span style={{
                            display: 'inline-block', padding: '1px 6px', borderRadius: 8,
                            background: status === 'moving' ? '#d1fae5' : status === 'idle' ? '#dbeafe' : '#ffedd5',
                            color: status === 'moving' ? '#065f46' : status === 'idle' ? '#1e40af' : '#9a3412',
                            fontWeight: 600,
                          }}>
                            {status === 'moving' ? 'Moving' : status === 'idle' ? 'Idle' : 'Signal Lost'}
                          </span>
                        </div>
                        {(() => {
                          const ride = getDriverRide(d.driverId);
                          if (!ride) return null;
                          return (
                            <div style={{
                              marginTop: 8, padding: '6px 8px', background: '#f0fdf4',
                              borderRadius: 6, fontSize: 12
                            }}>
                              <div style={{ fontWeight: 600, color: '#059669' }}>Active Ride</div>
                              <div style={{ color: '#333', marginTop: 2 }}>
                                {ride.pickupLocation || 'Pickup'} &rarr; {ride.dropoffLocation || 'Dropoff'}
                              </div>
                              {ride.requesterName && (
                                <div style={{ color: '#666', marginTop: 2 }}>
                                  Requester: {ride.requesterName}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}

            {/* Accuracy circle for selected driver */}
            {selectedDriver && interpolatedPositions[selectedDriver] && (
              <Circle
                center={interpolatedPositions[selectedDriver]}
                radius={50}
                options={{
                  strokeColor: '#4f46e5',
                  fillColor: '#4f46e5',
                  fillOpacity: 0.1,
                  strokeWeight: 1,
                }}
              />
            )}

            {/* Driver trail polyline */}
            {selectedDriver && driverTrail.length > 1 && (
              <Polyline
                path={driverTrail}
                options={{
                  strokeColor: '#6366f1',
                  strokeOpacity: 0.6,
                  strokeWeight: 3,
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '15px',
                  }],
                }}
              />
            )}

            {/* Selected ride — actual driving route via Google Directions */}
            {directionsResult && (
              <DirectionsRenderer
                directions={directionsResult}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#4f46e5',
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                  },
                }}
              />
            )}
            {/* Custom Pickup / Stops / Dropoff markers for selected ride */}
            {directionsResult && selectedRide?._pickupCoord && (
              <Marker
                position={selectedRide._pickupCoord}
                label={{ text: 'P', color: 'white', fontWeight: 'bold', fontSize: '13px' }}
                icon={window.google?.maps ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 16,
                  fillColor: '#059669',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 3,
                  labelOrigin: new window.google.maps.Point(0, 0)
                } : undefined}
                title={`Pickup: ${selectedRide.pickupLocation}`}
                zIndex={1000}
              />
            )}
            {directionsResult && selectedRide?._dropoffCoord && (
              <Marker
                position={selectedRide._dropoffCoord}
                label={{ text: 'D', color: 'white', fontWeight: 'bold', fontSize: '13px' }}
                icon={window.google?.maps ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 16,
                  fillColor: '#dc2626',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 3,
                  labelOrigin: new window.google.maps.Point(0, 0)
                } : undefined}
                title={`Dropoff: ${selectedRide.dropoffLocation}`}
                zIndex={1000}
              />
            )}
            {/* Intermediate stops */}
            {directionsResult && selectedRide?.stops?.map((stop, i) => {
              const coord = stop._coord;
              if (!coord) return null;
              return (
                <Marker
                  key={`stop-${i}`}
                  position={coord}
                  label={{ text: `${i + 1}`, color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                  icon={window.google?.maps ? {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: '#f59e0b',
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 3,
                    labelOrigin: new window.google.maps.Point(0, 0)
                  } : undefined}
                  title={`Stop ${i + 1}: ${stop.location}`}
                  zIndex={999}
                />
              );
            })}

            {/* Live driver position on selected ride (for in-progress/assigned rides) */}
            {selectedRide && ['assigned', 'in-progress'].includes(selectedRide.status) && (() => {
              const driverId = selectedRide.assignedDriver?._id || selectedRide.assignedDriver;
              const driverLoc = driverLocations[driverId];
              if (!driverLoc) return null;
              const status = driverStatus(driverLoc);
              return (
                <>
                  <Marker
                    position={{ lat: driverLoc.lat, lng: driverLoc.lng }}
                    label={{ text: driverLoc.name?.charAt(0) || 'D', color: 'white', fontWeight: 'bold', fontSize: '13px' }}
                    icon={window.google?.maps ? {
                      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 7,
                      fillColor: driverMarkerColor(status),
                      fillOpacity: 1,
                      strokeColor: 'white',
                      strokeWeight: 2,
                      rotation: driverLoc.heading || 0,
                      anchor: new window.google.maps.Point(0, 3),
                      labelOrigin: new window.google.maps.Point(0, -2)
                    } : undefined}
                    title={`Driver: ${driverLoc.name} (${status})`}
                    zIndex={1001}
                  />
                  {/* Pulsing accuracy circle around driver */}
                  <Circle
                    center={{ lat: driverLoc.lat, lng: driverLoc.lng }}
                    radius={60}
                    options={{
                      strokeColor: driverMarkerColor(status),
                      fillColor: driverMarkerColor(status),
                      fillOpacity: 0.12,
                      strokeWeight: 1,
                      strokeOpacity: 0.4,
                    }}
                  />
                </>
              );
            })()}

            {/* Geofence zones */}
            {geofences.map(gf => (
              <Circle
                key={gf._id || gf.name}
                center={gf.center || { lat: gf.lat, lng: gf.lng }}
                radius={gf.radius || 500}
                options={{
                  strokeColor: '#8b5cf6',
                  fillColor: '#8b5cf6',
                  fillOpacity: 0.08,
                  strokeWeight: 2,
                  strokeOpacity: 0.6,
                }}
              />
            ))}

            {/* Pending geofence zone */}
            {pendingZoneCenter && (
              <Circle
                center={pendingZoneCenter}
                radius={Number(zoneRadius) || 500}
                options={{
                  strokeColor: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.15,
                  strokeWeight: 2,
                  strokeDashArray: '5,5',
                }}
              />
            )}

            {/* Nearby driver highlight circles */}
            {nearbyDrivers.map(id => {
              const pos = interpolatedPositions[id];
              if (!pos) return null;
              return (
                <Circle
                  key={`nearby-${id}`}
                  center={pos}
                  radius={120}
                  options={{
                    strokeColor: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.15,
                    strokeWeight: 2,
                  }}
                />
              );
            })}
          </GoogleMapWrapper>

          {/* ── Stats overlay ── */}
          <div className="livemap-overlay-stats">
            <div className="livemap-stat">
              <Radio size={14} color="#059669" />
              <span>{driverList.length} Live</span>
            </div>
            <div className="livemap-stat">
              <Navigation size={14} color="#4f46e5" />
              <span>{activeTrips.length} Trips</span>
            </div>
            <div className="livemap-stat">
              <Car size={14} color="#dc2626" />
              <span>{filteredRides.length} Rides</span>
            </div>
            {offlineCount > 0 && (
              <div className="livemap-stat">
                <WifiOff size={14} color="#f97316" />
                <span>{offlineCount} Offline</span>
              </div>
            )}
          </div>

          {/* ── Map controls ── */}
          <div className="livemap-controls">
            {driverList.length > 0 && (
              <button className="livemap-control-btn" onClick={fitAllDrivers} title="Fit all drivers">
                <Maximize2 size={16} />
              </button>
            )}
            {selectedDriver && (
              <button
                className={`livemap-control-btn ${autoFollow ? 'active' : ''}`}
                onClick={() => setAutoFollow(!autoFollow)}
                title={autoFollow ? 'Stop following' : 'Follow driver'}
              >
                <Crosshair size={16} />
              </button>
            )}
            <button
              className={`livemap-control-btn ${showTraffic ? 'active' : ''}`}
              onClick={() => setShowTraffic(!showTraffic)}
              title={showTraffic ? 'Hide traffic' : 'Show traffic'}
            >
              <Layers size={16} />
            </button>
            <button
              className={`livemap-control-btn ${addingZone ? 'active' : ''}`}
              onClick={() => {
                if (addingZone) {
                  cancelZoneCreation();
                } else {
                  setAddingZone(true);
                  addToast('Click on the map to place zone center', 'info');
                }
              }}
              title="Add geofence zone"
            >
              <PlusCircle size={16} />
            </button>
          </div>

          {/* ── Geofence creation dialog ── */}
          {pendingZoneCenter && (
            <>
              <div className="livemap-dialog-overlay" onClick={cancelZoneCreation} />
              <div className="livemap-geofence-dialog">
                <h4>New Geofence Zone</h4>
                <label>Zone Name</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={e => setZoneName(e.target.value)}
                  placeholder="e.g. Airport Terminal"
                  autoFocus
                />
                <label>Radius (meters)</label>
                <input
                  type="number"
                  value={zoneRadius}
                  onChange={e => setZoneRadius(e.target.value)}
                  min={50}
                  max={50000}
                  placeholder="500"
                />
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Center: {pendingZoneCenter.lat.toFixed(5)}, {pendingZoneCenter.lng.toFixed(5)}
                </div>
                <div className="dialog-actions">
                  <button className="btn-cancel" onClick={cancelZoneCreation}>Cancel</button>
                  <button className="btn-save" onClick={saveGeofence} disabled={!zoneName.trim()}>
                    Save Zone
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Toast notifications ── */}
          <div className="livemap-toast-container">
            {toasts.map(t => (
              <div key={t.id} className={`livemap-toast ${t.type}`}>
                {t.message}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="livemap-panel">
          <div className="livemap-panel-tabs">
            <button
              className={`livemap-panel-tab ${panelTab === 'drivers' ? 'active' : ''}`}
              onClick={() => setPanelTab('drivers')}
            >
              Active Drivers ({driverList.length})
            </button>
            <button
              className={`livemap-panel-tab ${panelTab === 'rides' ? 'active' : ''}`}
              onClick={() => setPanelTab('rides')}
            >
              Active Rides ({filteredRides.length})
            </button>
          </div>

          <div className="livemap-panel-content">
            {/* ── Drivers Tab ── */}
            {panelTab === 'drivers' && (
              <>
                {driverList.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    <Radio size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No drivers sharing location.
                    <br />Locations appear when drivers start active trips.
                  </div>
                ) : (
                  driverList.map(d => {
                    const ride = getDriverRide(d.driverId);
                    const isSelected = selectedDriver === d.driverId;
                    const status = driverStatus(d);
                    const isNearby = nearbyDrivers.includes(d.driverId);

                    return (
                      <div
                        key={d.driverId}
                        className={`livemap-driver-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => focusDriver(d.driverId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: 5, flexShrink: 0,
                            background: driverMarkerColor(status),
                            boxShadow: status === 'moving' ? '0 0 0 3px rgba(5,150,105,0.2)' : 'none'
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.name}
                              </span>
                              {isNearby && <span className="livemap-nearby-badge">Nearby</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>
                                {status === 'moving' ? 'Moving' : status === 'idle' ? 'Idle' : 'Signal Lost'}
                              </span>
                              {d.speed > 0 && <span>&middot; {(d.speed * 2.237).toFixed(0)} mph</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                            {timeSince(d.timestamp)}
                          </div>
                        </div>
                        {ride && (
                          <div style={{
                            marginTop: 6, marginLeft: 20, padding: '4px 8px',
                            background: 'var(--color-gray-light)', borderRadius: 6, fontSize: 11,
                            color: 'var(--color-text-secondary)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            <MapPin size={10} style={{ verticalAlign: '-1px' }} /> {ride.pickupLocation || 'Pickup'} &rarr; {ride.dropoffLocation || 'Dropoff'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Active Trips sub-section */}
                {activeTrips.length > 0 && (
                  <>
                    <div style={{
                      padding: '12px 16px', borderTop: '1px solid var(--color-border)',
                      fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)'
                    }}>
                      Active Trips
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: 200 }}>
                      {activeTrips.map(t => (
                        <div key={t._id} style={{
                          padding: '10px 16px', borderBottom: '1px solid var(--color-border-light)', fontSize: 13
                        }}>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          <div style={{
                            color: 'var(--color-text-secondary)', fontSize: 12,
                            display: 'flex', alignItems: 'center', gap: 4, marginTop: 2
                          }}>
                            <Users size={11} /> {t.driver?.name || 'Unassigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Rides Tab ── */}
            {panelTab === 'rides' && (
              <>
                {filteredRides.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    <Car size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No active rides right now.
                  </div>
                ) : (
                  filteredRides.map(ride => {
                    const isSelected = selectedRide?._id === ride._id;
                    const driverId = ride.assignedDriver?._id || ride.assignedDriver;
                    const driverName = ride.assignedDriver?.name || ride.assignedDriver?.firstName ||
                      (typeof ride.assignedDriver === 'string' ? 'Assigned' : 'Unassigned');
                    const isDriverLive = driverId && driverLocations[driverId];
                    const driverSpeed = isDriverLive ? driverLocations[driverId].speed : null;

                    return (
                      <div
                        key={ride._id}
                        className={`livemap-ride-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => focusRide(ride)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ride.requesterName || ride.requester?.name || ride.requester?.firstName || 'Requester'}
                              </span>
                              {isDriverLive && ['assigned', 'in-progress'].includes(ride.status) && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                                  background: '#dcfce7', color: '#059669'
                                }}>
                                  <Radio size={8} className="pulse-icon" /> LIVE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <MapPin size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ride.pickupLocation || 'Pickup'} &rarr; {ride.dropoffLocation || 'Dropoff'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Users size={10} />
                              <span>{driverName}</span>
                              {ride.eta && (
                                <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                                  &middot; ETA {ride.eta}m
                                </span>
                              )}
                              {isDriverLive && driverSpeed > 0 && (
                                <span style={{ color: '#059669', fontWeight: 600 }}>
                                  &middot; {(driverSpeed * 2.237).toFixed(0)} mph
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span className={`livemap-ride-status ${ride.status}`}>
                              {ride.status}
                            </span>
                            {ride.isSharedRide && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: '#ede9fe', color: '#7c3aed' }}>
                                SHARED
                              </span>
                            )}
                            {ride.assignedVehicle?.capacity && (
                              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                                {(ride.sharedPassengers?.filter(p => p.status !== 'dropped-off')?.length || 0) + 1}/{ride.assignedVehicle.capacity} seats
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stops preview when selected */}
                        {isSelected && ride.stops?.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
                              Route Stops ({ride.stops.filter(s => s.status === 'completed').length}/{ride.stops.length} completed)
                            </div>
                            {ride.stops.sort((a, b) => a.order - b.order).map((stop, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 3, color: stop.status === 'completed' ? '#059669' : 'var(--color-text-secondary)' }}>
                                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: stop.status === 'completed' ? '#dcfce7' : stop.action === 'pickup' ? '#dbeafe' : '#fce7f3', color: stop.status === 'completed' ? '#059669' : stop.action === 'pickup' ? '#2563eb' : '#db2777' }}>
                                  {stop.status === 'completed' ? '✓' : i + 1}
                                </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: stop.status === 'completed' ? 'line-through' : 'none' }}>
                                  {stop.location}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 600, flexShrink: 0, color: stop.action === 'pickup' ? '#2563eb' : stop.action === 'dropoff' ? '#db2777' : '#6b7280' }}>
                                  {stop.action === 'pickup' ? '↑' : stop.action === 'dropoff' ? '↓' : '↕'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Shared passengers when selected */}
                        {isSelected && ride.sharedPassengers?.length > 0 && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--color-border-light)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
                              Passengers
                            </div>
                            {ride.sharedPassengers.map((p, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 2 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: p.status === 'dropped-off' ? '#9ca3af' : p.status === 'picked-up' ? '#059669' : '#f59e0b' }} />
                                <span style={{ fontWeight: 500 }}>{p.name || p.user?.name || 'Passenger'}</span>
                                <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                                  {p.status === 'dropped-off' ? 'Dropped off' : p.status === 'picked-up' ? 'In car' : 'Waiting'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
