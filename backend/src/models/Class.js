import mongoose from 'mongoose';
import './Coach.js';

const classSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    coachName: {
      type: String,
      required: true,
      trim: true
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      default: null
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    schedule: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    maxStudents: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 500000
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

classSchema.index({ title: 'text', description: 'text', coachName: 'text' });

export default mongoose.model('Class', classSchema);
