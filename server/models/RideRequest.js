import mongoose from 'mongoose';

const rideRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: {
    type: String,
    enum: ['production', 'ad-department', 'camera', 'art', 'hair-makeup', 'wardrobe', 'sound', 'electric', 'grip', 'locations', 'talent', 'other'],
    default: 'other'
  },
  pickupLocation: { type: String, required: true },
  pickupCoordinates: { lat: { type: Number }, lng: { type: Number } },
  dropoffLocation: { type: String, required: true },
  dropoffCoordinates: { lat: { type: Number }, lng: { type: Number } },
  pickupTime: { type: Date, required: true }, // Can be ASAP (set to now) or scheduled
  passengerCount: { type: Number, required: true, min: 1, default: 1 },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'normal', 'low'],
    default: 'normal'
  },
  notes: { type: String, maxlength: 500 },
  callType: { type: String, enum: ['self', 'coordinator', null], default: null },
  isPACall: { type: Boolean, default: false },
  // Multi-stop route: each stop has a location, action (pickup/dropoff), and passengers
  stops: [{
    location: { type: String, required: true },
    coordinates: { lat: { type: Number }, lng: { type: Number } },
    action: { type: String, enum: ['pickup', 'dropoff', 'both'], default: 'both' },
    passengers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String }
    }],
    order: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
    completedAt: { type: Date }
  }],
  // Shared ride: this ride is shared with others on the same vehicle
  isSharedRide: { type: Boolean, default: false },
  // Passengers in this car (for shared rides — all people riding along)
  sharedPassengers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    pickupLocation: { type: String },
    pickupCoordinates: { lat: { type: Number }, lng: { type: Number } },
    dropoffLocation: { type: String },
    dropoffCoordinates: { lat: { type: Number }, lng: { type: Number } },
    status: { type: String, enum: ['waiting', 'picked-up', 'dropped-off'], default: 'waiting' }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  eta: { type: Number }, // Minutes until arrival
  completedAt: { type: Date },
  rejectionReason: { type: String },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' } // Optional link to formal trip
}, { timestamps: true });

rideRequestSchema.index({ status: 1, createdAt: -1 });
rideRequestSchema.index({ requester: 1, createdAt: -1 });
rideRequestSchema.index({ assignedDriver: 1, status: 1 });

export default mongoose.model('RideRequest', rideRequestSchema);
