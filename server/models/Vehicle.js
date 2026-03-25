import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['car', 'van', 'minibus', 'suv', 'shuttle'], required: true },
  licensePlate: { type: String, required: true, unique: true, uppercase: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['available', 'in-use', 'maintenance'], default: 'available' },
  notes: { type: String, trim: true },
  mileage: { type: Number, default: 0 },
  fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid'], default: 'gasoline' },
  lastServiceDate: Date,
  nextServiceDate: Date,
  insuranceExpiry: Date,
  registrationExpiry: Date,
  permanentDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Permanent Trip linking
  permanentTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'PermanentTrip', default: null },
  allocationType: { type: String, enum: ['available', 'permanent', 'temporary'], default: 'available' }
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
