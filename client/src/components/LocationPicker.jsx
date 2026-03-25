import { useState, useRef, useCallback, useEffect } from 'react';
import GoogleMapWrapper, { Marker } from './GoogleMap';
import { MapPin, Search, X, Crosshair } from 'lucide-react';

/**
 * LocationPicker — Pick a location from Google Maps with search + click
 *
 * Props:
 *   value: string (current address text)
 *   coordinates: { lat, lng } | null
 *   onChange: (address, coords) => void
 *   placeholder: string
 *   label: string
 *   markerColor: string (hex)
 *   markerLabel: string (single char)
 */
export default function LocationPicker({
  value = '',
  coordinates = null,
  onChange,
  placeholder = 'Search or click map...',
  label,
  markerColor = '#4f46e5',
  markerLabel = '',
  compact = false
}) {
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [selectedPos, setSelectedPos] = useState(coordinates);
  const [selectedAddress, setSelectedAddress] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchQuery(value);
    setSelectedAddress(value);
  }, [value]);

  useEffect(() => {
    setSelectedPos(coordinates);
  }, [coordinates]);

  // Google Places Autocomplete
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }
    if (!window.google?.maps?.places?.AutocompleteService) return;

    if (!autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    }

    autocompleteRef.current.getPlacePredictions(
      { input: query, componentRestrictions: { country: 'us' } },
      (predictions, status) => {
        if (status === 'OK' && predictions) {
          setSuggestions(predictions.map(p => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text,
            secondaryText: p.structured_formatting?.secondary_text
          })));
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  // Select a suggestion → geocode to get coordinates
  const selectSuggestion = useCallback((suggestion) => {
    if (!window.google?.maps?.Geocoder) return;
    setSearchLoading(true);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: suggestion.placeId }, (results, status) => {
      setSearchLoading(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        const address = suggestion.description;
        setSelectedPos(coords);
        setSelectedAddress(address);
        setSearchQuery(address);
        setSuggestions([]);
        if (mapRef.current) {
          mapRef.current.panTo(coords);
          mapRef.current.setZoom(16);
        }
        onChange?.(address, coords);
      }
    });
  }, [onChange]);

  // Click on map → reverse geocode
  const handleMapClick = useCallback((e) => {
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedPos(coords);

    if (!window.google?.maps?.Geocoder) {
      setSelectedAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      setSearchQuery(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      onChange?.(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, coords);
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        setSelectedAddress(address);
        setSearchQuery(address);
        onChange?.(address, coords);
      } else {
        const fallback = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        setSelectedAddress(fallback);
        setSearchQuery(fallback);
        onChange?.(fallback, coords);
      }
    });
  }, [onChange]);

  // Use current location
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedPos(coords);
        if (mapRef.current) {
          mapRef.current.panTo(coords);
          mapRef.current.setZoom(16);
        }
        // Reverse geocode
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: coords }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setSelectedAddress(results[0].formatted_address);
              setSearchQuery(results[0].formatted_address);
              onChange?.(results[0].formatted_address, coords);
            }
          });
        }
      },
      () => alert('Could not get your location')
    );
  }, [onChange]);

  const confirmSelection = () => {
    onChange?.(selectedAddress || searchQuery, selectedPos);
    setShowMap(false);
    setSuggestions([]);
  };

  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-secondary)' }}>{label}</label>}

      {/* Input with map toggle */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="form-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (showMap) handleSearchChange(e.target.value);
              else onChange?.(e.target.value, selectedPos);
            }}
            onFocus={() => { if (searchQuery.length >= 3) handleSearchChange(searchQuery); }}
            style={{ paddingRight: 30 }}
          />
          {selectedPos && (
            <MapPin size={14} color={markerColor} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: showMap ? '#4f46e5' : 'var(--color-surface)',
            color: showMap ? 'white' : 'var(--color-text)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
          }}
          title="Pick from map"
        >
          <MapPin size={14} />
          {!compact && 'Map'}
        </button>
      </div>

      {/* Autocomplete suggestions dropdown */}
      {suggestions.length > 0 && !showMap && (
        <div style={{
          position: 'absolute', zIndex: 2000, background: 'white', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto',
          width: inputRef.current?.offsetWidth || 300, marginTop: 4
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.placeId || i}
              onClick={() => selectSuggestion(s)}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                fontSize: 13, transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.target.style.background = 'white'}
            >
              <div style={{ fontWeight: 600 }}>{s.mainText}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.secondaryText}</div>
            </div>
          ))}
        </div>
      )}

      {/* Map picker */}
      {showMap && (
        <div style={{
          marginTop: 8, borderRadius: 12, overflow: 'hidden',
          border: '2px solid var(--color-border)', height: compact ? 250 : 320,
          position: 'relative'
        }}>
          <GoogleMapWrapper
            center={selectedPos || { lat: 34.0522, lng: -118.2437 }}
            zoom={selectedPos ? 15 : 12}
            onLoad={(map) => { mapRef.current = map; }}
            onClick={handleMapClick}
          >
            {selectedPos && (
              <Marker
                position={selectedPos}
                draggable={true}
                onDragEnd={(e) => {
                  const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                  setSelectedPos(coords);
                  // Reverse geocode the new position
                  if (window.google?.maps?.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ location: coords }, (results, status) => {
                      if (status === 'OK' && results[0]) {
                        setSelectedAddress(results[0].formatted_address);
                        setSearchQuery(results[0].formatted_address);
                        onChange?.(results[0].formatted_address, coords);
                      } else {
                        const fallback = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
                        setSelectedAddress(fallback);
                        setSearchQuery(fallback);
                        onChange?.(fallback, coords);
                      }
                    });
                  }
                }}
                label={markerLabel ? { text: markerLabel, color: 'white', fontWeight: 'bold', fontSize: '12px' } : undefined}
                icon={window.google?.maps ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 14,
                  fillColor: markerColor,
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 3,
                  labelOrigin: new window.google.maps.Point(0, 0)
                } : undefined}
                title="Drag to adjust location"
              />
            )}
          </GoogleMapWrapper>

          {/* Search bar inside map */}
          <div style={{
            position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  placeholder="Search location..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 32px', borderRadius: 8,
                    border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                style={{
                  padding: '10px', borderRadius: 8, border: 'none',
                  background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
                title="Use current location"
              >
                <Crosshair size={16} color="#4f46e5" />
              </button>
            </div>

            {/* Suggestions inside map */}
            {suggestions.length > 0 && (
              <div style={{
                marginTop: 4, background: 'white', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 150, overflowY: 'auto'
              }}>
                {suggestions.map((s, i) => (
                  <div
                    key={s.placeId || i}
                    onClick={() => selectSuggestion(s)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9', fontSize: 12
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <div style={{ fontWeight: 600 }}>{s.mainText}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.secondaryText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '10px 12px', background: 'rgba(255,255,255,0.95)',
            borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <div style={{ flex: 1, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedPos ? (selectedAddress || `${selectedPos.lat.toFixed(4)}, ${selectedPos.lng.toFixed(4)}`) : 'Click map or search to select'}
            </div>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={!selectedPos}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: selectedPos ? '#4f46e5' : '#e2e8f0',
                color: selectedPos ? 'white' : '#94a3b8',
                fontSize: 12, fontWeight: 700, cursor: selectedPos ? 'pointer' : 'default'
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => { setShowMap(false); setSuggestions([]); }}
              style={{
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: '#f1f5f9', color: '#64748b',
                fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Coordinates display */}
      {selectedPos && !showMap && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          📍 {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
}
