import { Clock, MapPin, Flag, User, Car, UsersRound } from 'lucide-react';
import StatusBadge from './StatusBadge';
import './TripCard.css';

export default function TripCard({ trip, onClick }) {
  const firstPassenger = trip.passengers?.[0];
  const pickupTime = firstPassenger?.pickupTime
    ? new Date(firstPassenger.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="trip-card card" onClick={onClick}>
      <div className="trip-card-header">
        <h3 className="trip-card-title">{trip.title}</h3>
        <StatusBadge status={trip.status} />
      </div>

      <div className="trip-card-details">
        {pickupTime && (
          <div className="trip-card-detail">
            <Clock size={15} className="trip-detail-icon" />
            <span>{pickupTime}</span>
          </div>
        )}

        {firstPassenger && (
          <>
            <div className="trip-card-detail">
              <MapPin size={15} className="trip-detail-icon" />
              <span className="trip-detail-text">{firstPassenger.pickupAddress}</span>
            </div>
            <div className="trip-card-detail">
              <Flag size={15} className="trip-detail-icon" />
              <span className="trip-detail-text">{firstPassenger.dropoffAddress}</span>
            </div>
          </>
        )}

        <div className="trip-card-meta">
          {trip.driver && (
            <span className="trip-meta-item">
              <User size={13} />
              {trip.driver.name}
            </span>
          )}
          {trip.vehicle && (
            <span className="trip-meta-item">
              <Car size={13} />
              {trip.vehicle.name}
            </span>
          )}
          <span className="trip-meta-item">
            <UsersRound size={13} />
            {trip.passengers?.length || 0} passenger{trip.passengers?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
