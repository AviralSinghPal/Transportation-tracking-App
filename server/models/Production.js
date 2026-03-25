import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status: { type: String, enum: ['active', 'wrapped', 'pre-production'], default: 'active' },
  startDate: Date,
  endDate: Date,
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  baseLocation: { type: String, trim: true },
  notes: { type: String, trim: true },
  budget: {
    total: { type: Number, default: 0 },
    spent: { type: Number, default: 0 }
  }
}, { timestamps: true });

productionSchema.index({ coordinator: 1, status: 1 });

export default mongoose.model('Production', productionSchema);
