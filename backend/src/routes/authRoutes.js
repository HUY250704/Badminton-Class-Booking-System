import express from 'express';
import { login, me, register } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, me);

export default router;
