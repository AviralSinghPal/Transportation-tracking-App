import mongoose from 'mongoose';

const tripEventSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  type: {
    type: String,
    enum: [
      'created', 'assigned', 'driver-departed', 'arrived-pickup',
      'passenger-picked-up', 'arrived-destination', 'completed',
      'reassigned', 'cancelled'
    ],
    required: true
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: String },
  location: {
    lat: Number,
    lng: Number
  },
  timestamp: { type: Date, default: Date.now }
});

tripEventSchema.index({ trip: 1, timestamp: 1 });

export default mongoose.model('TripEvent', tripEventSchema);
