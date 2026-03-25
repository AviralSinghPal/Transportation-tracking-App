import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  channel: { type: String, enum: ['direct', 'trip', 'broadcast'], default: 'direct' },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachmentUrl: String,
  attachmentType: { type: String, enum: ['image', 'file', null] }
}, { timestamps: true });

chatMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
chatMessageSchema.index({ trip: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
