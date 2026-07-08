import express from 'express';
import {
  changePassword,
  firebaseLogin,
  forgotPassword,
  googleAuthUrl,
  googleCallback,
  login,
  logout,
  me,
  register,
  resetPassword,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/google/url', googleAuthUrl);
router.post('/google/callback', googleCallback);
router.post('/firebase', firebaseLogin);
router.get('/me', protect, me);
router.patch('/me', protect, updateProfile);
router.patch('/me/password', protect, changePassword);
router.post('/logout', protect, logout);

export default router;
