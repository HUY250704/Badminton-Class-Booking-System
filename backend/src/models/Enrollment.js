import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

enrollmentSchema.index({ class: 1, user: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
