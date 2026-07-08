import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['waiting', 'promoted', 'cancelled'],
      default: 'waiting'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    promotedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

waitlistSchema.index({ class: 1, user: 1 }, { unique: true });
waitlistSchema.index({ class: 1, status: 1, joinedAt: 1 });

export default mongoose.model('Waitlist', waitlistSchema);
