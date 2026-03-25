import mongoose from 'mongoose';

const templatePassengerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  pickupAddress: { type: String, required: true },
  pickupLat: Number,
  pickupLng: Number,
  pickupTime: { type: String }, // stored as HH:MM for templates
  dropoffAddress: { type: String, required: true },
  dropoffLat: Number,
  dropoffLng: Number
}, { _id: true });

const tripTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['one-time', 'full-day', 'recurring'], default: 'one-time' },
  passengers: [templatePassengerSchema],
  preferredDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preferredVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  notes: { type: String, trim: true },
  recurringDays: [{ type: Number, min: 0, max: 6 }],
  estimatedDuration: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usageCount: { type: Number, default: 0 }
}, { timestamps: true });

tripTemplateSchema.index({ createdBy: 1 });

export default mongoose.model('TripTemplate', tripTemplateSchema);
