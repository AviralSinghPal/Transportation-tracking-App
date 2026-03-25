import mongoose from 'mongoose';

const talentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  preferredDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preferences: {
    vehicleType: { type: String, default: '' },     // "SUV", "Van", "Sedan"
    temperature: { type: String, default: 'Normal' }, // "Cool", "Warm", "Normal"
    music: { type: String, default: 'No preference' }, // "No music", "Classical", "Pop", etc.
    waterBrand: { type: String, default: '' },       // "Evian", "Fiji", etc.
    snacks: [{ type: String }],                      // ["Almonds", "Protein bars"]
    otherNotes: { type: String, default: '' }
  },
  confidential: { type: Boolean, default: true }, // Hide address from non-coordinators
  homeAddress: { type: String, default: '' },
  hotelAddress: { type: String, default: '' },
  agentName: { type: String, default: '' },
  agentPhone: { type: String, default: '' },
  costTracking: {
    totalTrips: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    totalMiles: { type: Number, default: 0 }
  },
  currentStatus: {
    type: String,
    enum: ['at-home', 'at-hotel', 'traveling', 'on-set', 'in-hair-makeup', 'in-wardrobe', 'wrapped'],
    default: 'at-hotel'
  },
  production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' }
}, { timestamps: true });

talentProfileSchema.index({ user: 1 }, { unique: true });
talentProfileSchema.index({ production: 1 });

export default mongoose.model('TalentProfile', talentProfileSchema);
