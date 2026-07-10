import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'VND'
    },
    provider: {
      type: String,
      enum: ['stripe', 'manual'],
      default: 'stripe'
    },
    providerRef: {
      type: String,
      required: true,
      unique: true
    },
    checkoutUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending'
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ user: 1, createdAt: -1 });
paymentTransactionSchema.index({ class: 1, status: 1 });

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
