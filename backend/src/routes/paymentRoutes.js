import express from 'express';
import {
  downloadInvoice,
  myPayments,
  simulatePaymentSuccess,
  vnpayReturn
} from '../controllers/advancedController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validate.js';

const router = express.Router();

router.get('/my', protect, myPayments);
router.get('/vnpay-return', vnpayReturn);
router.post('/:transactionId/simulate-success', validateObjectId('transactionId'), protect, simulatePaymentSuccess);
router.get('/invoices/:invoiceId.pdf', validateObjectId('invoiceId'), protect, downloadInvoice);

export default router;
