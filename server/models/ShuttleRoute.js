import mongoose from 'mongoose';

const shuttleRouteSchema = new mongoose.Schema({
  name: { type: String, required: true },  // "Base Camp → Set", "Crew Parking → Base Camp"
  type: {
    type: String,
    enum: ['crew', 'background', 'custom'],
    default: 'crew'
  },
  stops: [{
    name: { type: String, required: true },       // "Crew Parking Lot A"
    address: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },
    estimatedTime: { type: String },               // "07:00", "07:15" - HH:MM format
    order: { type: Number, required: true }
  }],
  frequency: { type: Number, default: 30 },        // Every X minutes
  startTime: { type: String, required: true },     // "06:00"
  endTime: { type: String, required: true },       // "22:00"
  capacity: { type: Number, required: true },      // Vehicle capacity for this shuttle
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  daysActive: [{ type: Number, min: 0, max: 6 }], // [1,2,3,4,5] for weekdays (0=Sun)
  notes: { type: String, default: '' },
  production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' }
}, { timestamps: true });

shuttleRouteSchema.index({ isActive: 1 });
shuttleRouteSchema.index({ production: 1 });

export default mongoose.model('ShuttleRoute', shuttleRouteSchema);
