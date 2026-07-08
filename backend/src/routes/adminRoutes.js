import express from 'express';
import { adminMetrics, adminReports, auditLogs, decideTransfer, listTransfers } from '../controllers/advancedController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.use(protect, adminOnly);
router.get('/metrics', adminMetrics);
router.get('/reports', adminReports);
router.get('/audit-logs', auditLogs);
router.get('/transfers', listTransfers);
router.patch('/transfers/:id', validateObjectId('id'), decideTransfer);

export default router;
