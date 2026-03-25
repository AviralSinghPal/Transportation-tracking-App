import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  type: {
    type: String,
    enum: ['oil-change', 'tire-rotation', 'brake-check', 'inspection', 'repair', 'cleaning', 'other'],
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'overdue'], default: 'scheduled' },
  scheduledDate: { type: Date, required: true },
  completedDate: Date,
  cost: { type: Number, default: 0 },
  mileageAtService: Number,
  nextServiceMileage: Number,
  nextServiceDate: Date,
  performedBy: { type: String, trim: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

maintenanceSchema.index({ vehicle: 1, scheduledDate: -1 });
maintenanceSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model('Maintenance', maintenanceSchema);
