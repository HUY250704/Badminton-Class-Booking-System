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
    title: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    birthday: {
      type: String,
      trim: true,
      default: ''
    },
    gender: {
      type: String,
      trim: true,
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
    },
    certificates: {
      type: [String],
      default: []
    },
    yearsExperience: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  { timestamps: true }
);

coachSchema.index({ name: 'text', bio: 'text' });

export default mongoose.model('Coach', coachSchema);
