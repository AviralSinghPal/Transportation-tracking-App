import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['coordinator', 'driver', 'passenger'], required: true },
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  // Driver-specific fields
  licenseNumber: { type: String },
  licenseExpiry: { type: Date },
  isAvailable: { type: Boolean, default: true },
  isTemporary: { type: Boolean, default: false },
  lastLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  // Legacy PA fields (kept for backward compat)
  permanentAllocation: {
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    callConfig: { type: String, enum: ['actor', 'coordinator'], default: 'coordinator' },
    isTemporaryRelease: { type: Boolean, default: false },
    temporaryReleaseNote: { type: String, default: '' }
  },
  myDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // New: Permanent Trip assignment (driver-specific)
  permanentTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'PermanentTrip', default: null },
  isTripAssigned: { type: Boolean, default: false },
  // Actor self-arranged transport
  hasOwnTransport: { type: Boolean, default: false },
  ownTransportNotes: { type: String, default: '' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
