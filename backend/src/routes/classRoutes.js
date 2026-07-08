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
  createPayment,
  createTransferRequest,
  getAttendance,
  getClassWaitlist,
  getReviews,
  joinWaitlist,
  leaveWaitlist,
  markAttendance,
  myBookmarks,
  myWaitlist,
  myTransfers,
  toggleBookmark,
  upsertReview
} from '../controllers/advancedController.js';
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
router.get('/my/bookmarks', protect, myBookmarks);
router.get('/my/waitlist', protect, myWaitlist);
router.get('/my/transfers', protect, myTransfers);
router.get('/:id', validateObjectId('id'), optionalAuth, getClassById);
router.patch('/:id', validateObjectId('id'), protect, adminOnly, validateClassBody({ partial: true }), updateClass);
router.delete('/:id', validateObjectId('id'), protect, adminOnly, deleteClass);
router.post('/:id/payments', validateObjectId('id'), protect, createPayment);
router.post('/:id/enroll', validateObjectId('id'), protect, enrollInClass);
router.delete('/:id/enroll', validateObjectId('id'), protect, cancelEnrollment);
router.post('/:id/waitlist', validateObjectId('id'), protect, joinWaitlist);
router.delete('/:id/waitlist', validateObjectId('id'), protect, leaveWaitlist);
router.get('/:id/waitlist', validateObjectId('id'), protect, adminOnly, getClassWaitlist);
router.post('/:id/bookmark', validateObjectId('id'), protect, toggleBookmark);
router.get('/:id/reviews', validateObjectId('id'), getReviews);
router.post('/:id/reviews', validateObjectId('id'), protect, upsertReview);
router.get('/:id/attendance', validateObjectId('id'), protect, adminOnly, getAttendance);
router.put('/:id/attendance', validateObjectId('id'), protect, adminOnly, markAttendance);
router.post('/:id/transfers', validateObjectId('id'), protect, createTransferRequest);
router.get('/:id/students', validateObjectId('id'), protect, adminOnly, getClassStudents);

export default router;
