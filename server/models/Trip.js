import mongoose from 'mongoose';

const passengerStopSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  pickupAddress: { type: String, required: true },
  pickupLat: Number,
  pickupLng: Number,
  pickupTime: { type: Date, required: true },
  dropoffAddress: { type: String, required: true },
  dropoffLat: Number,
  dropoffLng: Number,
  dropoffTime: Date,
  status: { type: String, enum: ['waiting', 'picked-up', 'dropped-off'], default: 'waiting' }
}, { _id: true });

const tripSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['one-time', 'full-day', 'recurring'], default: 'one-time' },
  status: {
    type: String,
    enum: ['unassigned', 'assigned', 'driver-departed', 'in-progress', 'completed', 'cancelled'],
    default: 'unassigned'
  },
  passengers: [passengerStopSchema],
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  notes: { type: String, trim: true },
  recurringDays: [{ type: Number, min: 0, max: 6 }],
  estimatedDuration: Number,
  production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'TripTemplate' },
  cost: {
    mileage: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 },
    driverHours: { type: Number, default: 0 },
    driverRate: { type: Number, default: 0 },
    tolls: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  photoConfirmation: {
    pickupPhoto: String,
    dropoffPhoto: String,
    pickupTime: Date,
    dropoffTime: Date
  },
  signature: {
    data: String,
    signedAt: Date,
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  rating: { type: Number, min: 1, max: 5 },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

tripSchema.index({ date: 1, status: 1 });
tripSchema.index({ driver: 1, date: 1 });

export default mongoose.model('Trip', tripSchema);
