import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['driver-license', 'insurance', 'vehicle-registration', 'medical-cert', 'photo-confirmation', 'signature', 'other'],
    required: true
  },
  title: { type: String, required: true, trim: true },
  fileUrl: { type: String },
  fileName: { type: String },
  mimeType: { type: String },
  fileSize: Number,
  status: { type: String, enum: ['pending', 'verified', 'rejected', 'expired'], default: 'pending' },
  expiryDate: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  notes: { type: String, trim: true },
  signatureData: String // base64 signature for digital signatures
}, { timestamps: true });

documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ status: 1, expiryDate: 1 });

export default mongoose.model('Document', documentSchema);
