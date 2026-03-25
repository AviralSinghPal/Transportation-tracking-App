import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  pickupName: { type: String, trim: true }, // alternate name shown to driver
  contactNumber: { type: String, trim: true },
  isPrivate: { type: Boolean, default: false }, // hide contact from driver
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional link
  pickupLocation: { type: String, trim: true },
  pickupCoordinates: { lat: Number, lng: Number },
  dropoffLocation: { type: String, trim: true },
  dropoffCoordinates: { lat: Number, lng: Number }
}, { _id: true });

const permanentTripSchema = new mongoose.Schema({
  // Core info
  title: { type: String, trim: true },
  pickupLocation: { type: String, required: true, trim: true },
  pickupCoordinates: { lat: Number, lng: Number },
  dropoffLocation: { type: String, required: true, trim: true },
  dropoffCoordinates: { lat: Number, lng: Number },
  scheduledTime: { type: String, required: true }, // HH:MM format for daily schedule

  // Assignment
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  passengers: [passengerSchema],

  // Schedule period
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // null = indefinite
  activeDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun, 1=Mon...6=Sat — defaults to weekdays

  // Status & flags
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'deleted'],
    default: 'draft'
  },
  isFullDayTrip: { type: Boolean, default: false }, // all-day allocation
  isSelfManaged: { type: Boolean, default: false }, // driver manages route themselves

  // Allocation tracking
  isDriverAssigned: { type: Boolean, default: false },
  isVehicleAssigned: { type: Boolean, default: false },

  // Management
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, trim: true, default: '' },
  deletedAt: { type: Date, default: null }, // soft delete timestamp
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Swap history
  swapHistory: [{
    type: { type: String, enum: ['driver', 'vehicle'] },
    previousId: { type: mongoose.Schema.Types.ObjectId },
    newId: { type: mongoose.Schema.Types.ObjectId },
    reason: { type: String, trim: true },
    swappedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    swappedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Index for finding a driver's active permanent trip
permanentTripSchema.index({ driver: 1, status: 1 });
permanentTripSchema.index({ vehicle: 1, status: 1 });
permanentTripSchema.index({ status: 1, startDate: 1, endDate: 1 });

export default mongoose.model('PermanentTrip', permanentTripSchema);
