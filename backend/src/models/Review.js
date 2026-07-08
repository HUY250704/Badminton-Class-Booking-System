import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }
  },
  { timestamps: true }
);

reviewSchema.index({ class: 1, user: 1 }, { unique: true });
reviewSchema.index({ class: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
