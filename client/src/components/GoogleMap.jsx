import { useRef, useCallback, useMemo } from 'react';
import { GoogleMap as GM, useJsApiLoader } from '@react-google-maps/api';

// IMPORTANT: libraries must be a stable reference to avoid infinite re-renders
const LIBRARIES = ['places', 'geometry', 'drawing'];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }
];

const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false
};

export default function GoogleMapWrapper({
  center = { lat: 34.0522, lng: -118.2437 },
  zoom = 12,
  onLoad,
  onClick,
  children,
  style,
  darkMode = false,
  options = {}
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const mapRef = useRef(null);

  const handleLoad = useCallback((map) => {
    mapRef.current = map;
    if (onLoad) onLoad(map);
  }, [onLoad]);

  const mergedOptions = useMemo(() => ({
    ...defaultMapOptions,
    ...(darkMode ? { styles: darkMapStyle } : {}),
    ...options
  }), [darkMode, options]);

  if (loadError) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', color: '#64748b', fontSize: 14, flexDirection: 'column', gap: 8
      }}>
        <div style={{ fontWeight: 700 }}>Map failed to load</div>
        <div style={{ fontSize: 12 }}>Check your Google Maps API key</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <GM
      mapContainerStyle={{ width: '100%', height: '100%', ...style }}
      center={center}
      zoom={zoom}
      onLoad={handleLoad}
      onClick={onClick}
      options={mergedOptions}
    >
      {children}
    </GM>
  );
}

// Re-export components
export { Marker, InfoWindow, Polyline, Circle, Polygon, OverlayView, TrafficLayer, DirectionsRenderer, DirectionsService } from '@react-google-maps/api';
