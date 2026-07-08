import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import ClassModel from './models/Class.js';
import Enrollment from './models/Enrollment.js';
import User from './models/User.js';

dotenv.config();

await connectDB();

await Promise.all([
  ClassModel.deleteMany({}),
  Enrollment.deleteMany({}),
  User.deleteMany({})
]);

const [admin] = await User.create([
  {
    name: 'NAPA Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Demo User',
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  }
]);

await ClassModel.create([
  {
    title: 'Beginner Footwork Foundations',
    description: 'Learn grip, stance, split-step timing, and safe movement patterns for your first rallies.',
    coachName: 'Coach Minh Tran',
    level: 'beginner',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    schedule: 'Tue & Thu, 18:00 - 19:30',
    location: 'NAPA Court 1',
    maxStudents: 12,
    price: 500000,
    createdBy: admin._id
  },
  {
    title: 'Intermediate Doubles Rotation',
    description: 'Build sharper formations, front-back transitions, and pressure defense for club doubles.',
    coachName: 'Coach Linh Nguyen',
    level: 'intermediate',
    startDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    schedule: 'Mon & Wed, 19:30 - 21:00',
    location: 'NAPA Court 2',
    maxStudents: 10,
    price: 500000,
    createdBy: admin._id
  },
  {
    title: 'Advanced Match Tempo',
    description: 'High-intensity drills for deception, recovery speed, serve variation, and tactical shot selection.',
    coachName: 'Coach An Pham',
    level: 'advanced',
    startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    schedule: 'Sat, 08:00 - 10:00',
    location: 'NAPA Performance Hall',
    maxStudents: 8,
    price: 500000,
    createdBy: admin._id
  }
]);

await mongoose.connection.close();
console.log('Seed complete');
