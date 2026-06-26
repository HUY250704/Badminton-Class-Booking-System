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
import { validateClassBody, validateClassQuery, validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/', validateClassQuery, optionalAuth, getClasses);
router.post('/', protect, adminOnly, validateClassBody(), createClass);
router.get('/my/enrollments', protect, myEnrollments);
router.get('/:id', validateObjectId('id'), optionalAuth, getClassById);
router.patch('/:id', validateObjectId('id'), protect, adminOnly, validateClassBody({ partial: true }), updateClass);
router.delete('/:id', validateObjectId('id'), protect, adminOnly, deleteClass);
router.post('/:id/enroll', validateObjectId('id'), protect, enrollInClass);
router.delete('/:id/enroll', validateObjectId('id'), protect, cancelEnrollment);
router.get('/:id/students', validateObjectId('id'), protect, adminOnly, getClassStudents);

export default router;
