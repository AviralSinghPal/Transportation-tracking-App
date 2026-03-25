import mongoose from 'mongoose';

const shuttleRunSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'ShuttleRoute', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  scheduledDeparture: { type: Date, required: true },
  actualDeparture: { type: Date },
  arrivalTime: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'boarding', 'in-transit', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  occupancy: { type: Number, default: 0 },
  capacity: { type: Number, required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

shuttleRunSchema.index({ route: 1, scheduledDeparture: -1 });
shuttleRunSchema.index({ status: 1, scheduledDeparture: 1 });
shuttleRunSchema.index({ driver: 1, status: 1 });

export default mongoose.model('ShuttleRun', shuttleRunSchema);
