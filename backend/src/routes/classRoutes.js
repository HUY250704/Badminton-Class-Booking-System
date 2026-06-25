import express from 'express';
import {
  createClass,
  deleteClass,
  getClassById,
  getClasses,
  getClassStudents,
  updateClass
} from '../controllers/classController.js';
import {
  cancelEnrollment,
  enrollInClass,
  myEnrollments
} from '../controllers/enrollmentController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

router.get('/', optionalAuth, getClasses);
router.post('/', protect, adminOnly, createClass);
router.get('/my/enrollments', protect, myEnrollments);
router.get('/:id', optionalAuth, getClassById);
router.patch('/:id', protect, adminOnly, updateClass);
router.delete('/:id', protect, adminOnly, deleteClass);
router.post('/:id/enroll', protect, enrollInClass);
router.delete('/:id/enroll', protect, cancelEnrollment);
router.get('/:id/students', protect, adminOnly, getClassStudents);

export default router;
