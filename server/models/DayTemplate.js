import mongoose from 'mongoose';

const dayTemplateEntrySchema = new mongoose.Schema({
  type: { type: String, enum: ['trip', 'ride'], required: true },
  title: { type: String },
  // Common fields
  pickupLocation: { type: String, required: true },
  pickupCoordinates: { lat: Number, lng: Number },
  dropoffLocation: { type: String, required: true },
  dropoffCoordinates: { lat: Number, lng: Number },
  pickupTime: { type: String, required: true }, // HH:MM format (template, not absolute date)
  passengerCount: { type: Number, default: 1 },
  priority: { type: String, default: 'normal' },
  department: { type: String, default: 'other' },
  notes: { type: String, default: '' },
  // Passenger details (for trips with multiple stops)
  passengers: [{
    name: { type: String },
    phone: { type: String },
    pickupAddress: { type: String },
    pickupLat: Number,
    pickupLng: Number,
    pickupTime: { type: String }, // HH:MM
    dropoffAddress: { type: String },
    dropoffLat: Number,
    dropoffLng: Number
  }],
  // Stops for shared rides
  stops: [{
    location: { type: String },
    coordinates: { lat: Number, lng: Number },
    action: { type: String, enum: ['pickup', 'dropoff', 'both'], default: 'both' },
    passengers: [{ name: String }],
    order: Number
  }],
  // Preferred assignments
  preferredDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preferredVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  // Original requester (for rides)
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const dayTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sourceDate: { type: Date }, // The date this template was captured from
  entries: [dayTemplateEntrySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('DayTemplate', dayTemplateSchema);
