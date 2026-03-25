import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['trip-assigned', 'driver-on-way', 'driver-arrived',
           'trip-updated', 'delay-alert', 'document-pending',
           'ride-request', 'ride-assigned', 'ride-eta',
           'shuttle-alert', 'talent-traveling', 'talent-arrived'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
