import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const LOCATION_INTERVAL = 5000; // Send location every 5 seconds

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [locationSharing, setLocationSharing] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastLocationRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    const newSocket = io('http://localhost:5001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  // Start sharing driver location continuously
  const startLocationSharing = useCallback(() => {
    if (user?.role !== 'driver' || !socket || locationSharing) return;
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setLocationSharing(true);

    // Watch position for high-accuracy updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastLocationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy
        };
        // Try to get battery level
        if (navigator.getBattery) {
          navigator.getBattery().then(b => {
            if (lastLocationRef.current) lastLocationRef.current.batteryLevel = Math.round(b.level * 100);
          }).catch(() => {});
        }
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    // Send location at fixed interval to avoid flooding
    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current && socket?.connected) {
        socket.emit('driver:location', lastLocationRef.current);
      }
    }, LOCATION_INTERVAL);
  }, [socket, user, locationSharing]);

  // Stop sharing location
  const stopLocationSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastLocationRef.current = null;
    setLocationSharing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLocationSharing();
  }, [stopLocationSharing]);

  function markAllRead() {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <SocketContext.Provider value={{
      socket, notifications, unreadCount, setNotifications, setUnreadCount, markAllRead,
      locationSharing, startLocationSharing, stopLocationSharing
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
