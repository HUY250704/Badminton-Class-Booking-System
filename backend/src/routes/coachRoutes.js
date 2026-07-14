import express from 'express';
import { createCoach, getCoachById, listCoaches, updateCoach } from '../controllers/coachController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/', listCoaches);
router.get('/:id', validateObjectId('id'), getCoachById);
router.post('/', protect, adminOnly, createCoach);
router.patch('/:id', validateObjectId('id'), protect, updateCoach);

export default router;
