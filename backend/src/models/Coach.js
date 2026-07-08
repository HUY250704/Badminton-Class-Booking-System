import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    photoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    specialties: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

coachSchema.index({ name: 'text', bio: 'text' });

export default mongoose.model('Coach', coachSchema);
