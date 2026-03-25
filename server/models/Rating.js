import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 },
  type: { type: String, enum: ['passenger-to-driver', 'coordinator-to-driver'], required: true }
}, { timestamps: true });

ratingSchema.index({ ratedUser: 1, createdAt: -1 });
ratingSchema.index({ trip: 1, ratedBy: 1 }, { unique: true });

export default mongoose.model('Rating', ratingSchema);
