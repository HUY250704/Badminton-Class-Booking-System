import mongoose from 'mongoose';

const transferRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fromClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    toClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

transferRequestSchema.index({ user: 1, createdAt: -1 });
transferRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('TransferRequest', transferRequestSchema);
