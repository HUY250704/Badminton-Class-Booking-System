import express from 'express';
import {
  confirmStripeSessionPayment,
  downloadInvoice,
  myPayments,
  simulatePaymentSuccess
} from '../controllers/advancedController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/my', protect, myPayments);
router.post('/stripe-sessions/:sessionId/confirm', protect, confirmStripeSessionPayment);
router.post('/:transactionId/simulate-success', validateObjectId('transactionId'), protect, simulatePaymentSuccess);
router.get('/invoices/:invoiceId.pdf', validateObjectId('invoiceId'), protect, downloadInvoice);

export default router;
