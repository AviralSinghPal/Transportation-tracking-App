import mongoose from 'mongoose';

const locationHistorySchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  batteryLevel: { type: Number },
  rideRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'RideRequest' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Auto-delete after 30 days
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Fast queries for driver trail
locationHistorySchema.index({ driver: 1, timestamp: -1 });
// Fast queries for ride-specific trails
locationHistorySchema.index({ rideRequest: 1, timestamp: 1 });

export default mongoose.model('LocationHistory', locationHistorySchema);
