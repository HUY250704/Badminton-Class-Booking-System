import express from 'express';
import { createCoach, listCoaches, updateCoach } from '../controllers/coachController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, adminOnly, listCoaches);
router.post('/', protect, adminOnly, createCoach);
router.patch('/:id', validateObjectId('id'), protect, adminOnly, updateCoach);

export default router;
