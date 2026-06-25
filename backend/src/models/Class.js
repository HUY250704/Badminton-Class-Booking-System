import mongoose from 'mongoose';

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
