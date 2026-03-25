import mongoose from 'mongoose';

const geofenceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['circle', 'polygon'], default: 'circle' },
  center: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  radius: { type: Number, default: 200 }, // meters, for circle type
  polygon: [{
    lat: { type: Number },
    lng: { type: Number }
  }],
  color: { type: String, default: '#4f46e5' },
  triggers: {
    onEnter: { type: Boolean, default: true },
    onExit: { type: Boolean, default: true },
    notifyCoordinator: { type: Boolean, default: true },
    notifyPassenger: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

geofenceSchema.index({ isActive: 1 });

export default mongoose.model('Geofence', geofenceSchema);
