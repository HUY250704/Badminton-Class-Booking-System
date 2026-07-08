import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLog.js';
import Bookmark from '../models/Bookmark.js';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import Invoice from '../models/Invoice.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Review from '../models/Review.js';
import TransferRequest from '../models/TransferRequest.js';
import Waitlist from '../models/Waitlist.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../utils/audit.js';
import { paymentConfirmationEmail, sendEmail } from '../utils/email.js';
import { createInvoicePdfBuffer } from '../utils/pdf.js';
import { createVnpayCheckoutUrl, verifyVnpayReturn } from '../utils/vnpay.js';

const activeEnrollmentFilter = { status: { $ne: 'cancelled' } };

function classPrice(classItem) {
  return Number(classItem.price || process.env.DEFAULT_CLASS_PRICE || 500000);
}

function invoiceNumber() {
  return `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function createOrReuseInvoice(transaction) {
  let invoice = await Invoice.findOne({ transaction: transaction._id });
  if (invoice) return invoice;

  invoice = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    user: transaction.user,
    class: transaction.class,
    transaction: transaction._id,
    total: transaction.amount,
    currency: transaction.currency
  });
  return invoice;
}

async function sendPaymentNotification(transaction, invoice) {
  try {
    const populated = await PaymentTransaction.findById(transaction._id)
      .populate('user', 'name email')
      .populate('class', 'title');

    await sendEmail({
      to: populated.user.email,
      subject: 'Payment confirmed - Lin-Badminton',
      text: paymentConfirmationEmail({
        name: populated.user.name,
        classTitle: populated.class?.title,
        amount: populated.amount,
        currency: populated.currency,
        invoiceNumber: invoice?.invoiceNumber
      })
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Could not send payment notification:', error.message);
    }
  }
}

async function enrollPaidStudent({ classId, userId, session = null }) {
  const existing = await Enrollment.findOne({ class: classId, user: userId }).session(session);
  if (existing) {
    if (existing.status === 'cancelled') {
      existing.status = 'active';
      existing.cancelledAt = null;
      return existing.save({ session });
    }
    return existing;
  }

  const [enrollment] = await Enrollment.create([{ class: classId, user: userId, status: 'active' }], { session });
  return enrollment;
}

export const createPayment = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  if (classItem.startDate <= new Date()) {
    throw new ApiError(400, 'Cannot pay for a class that has already started.', 'CLASS_ALREADY_STARTED');
  }

  const currentStudents = await Enrollment.countDocuments({ class: classItem._id, ...activeEnrollmentFilter });
  if (currentStudents >= classItem.maxStudents) {
    throw new ApiError(409, 'Class is full. Join the waitlist instead.', 'CLASS_FULL');
  }

  const existingEnrollment = await Enrollment.findOne({ class: classItem._id, user: req.user._id, ...activeEnrollmentFilter });
  if (existingEnrollment) {
    throw new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED');
  }

  const providerRef = `CLS-${classItem._id}-${Date.now()}`;
  const amount = classPrice(classItem);
  const checkoutUrl = createVnpayCheckoutUrl({
    amount,
    orderId: providerRef,
    orderInfo: `Lin-Badminton ${classItem.title}`,
    ipAddr: req.ip
  });

  const transaction = await PaymentTransaction.create({
    user: req.user._id,
    class: classItem._id,
    amount,
    providerRef,
    checkoutUrl
  });

  await writeAuditLog({
    actor: req.user._id,
    action: 'payment.created',
    targetType: 'PaymentTransaction',
    targetId: transaction._id,
    metadata: { classId: classItem._id, amount }
  });

  res.status(201).json({
    transaction,
    checkoutUrl: checkoutUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/payments?pending=${transaction._id}`,
    sandboxReady: Boolean(checkoutUrl)
  });
});

export const simulatePaymentSuccess = asyncHandler(async (req, res) => {
  const transaction = await PaymentTransaction.findOne({
    _id: req.params.transactionId,
    user: req.user._id
  });

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  if (transaction.status === 'paid') {
    const invoice = await createOrReuseInvoice(transaction);
    res.json({ transaction, invoice });
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const classItem = await ClassModel.findById(transaction.class).session(session);
      if (!classItem) {
        throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
      }

      const currentStudents = await Enrollment.countDocuments({ class: classItem._id, ...activeEnrollmentFilter }).session(session);
      if (currentStudents >= classItem.maxStudents) {
        throw new ApiError(409, 'Class became full before payment was completed.', 'CLASS_FULL');
      }

      const enrollment = await enrollPaidStudent({ classId: transaction.class, userId: transaction.user, session });
      transaction.status = 'paid';
      transaction.enrollment = enrollment._id;
      transaction.paidAt = new Date();
      await transaction.save({ session });
    });
  } finally {
    session.endSession();
  }

  const invoice = await createOrReuseInvoice(transaction);
  await sendPaymentNotification(transaction, invoice);
  await Waitlist.updateOne({ class: transaction.class, user: transaction.user }, { status: 'cancelled' });
  await writeAuditLog({
    actor: req.user._id,
    action: 'payment.paid',
    targetType: 'PaymentTransaction',
    targetId: transaction._id,
    metadata: { classId: transaction.class, amount: transaction.amount }
  });

  res.json({ transaction, invoice });
});

export const vnpayReturn = asyncHandler(async (req, res) => {
  const providerRef = req.query.vnp_TxnRef;
  const responseCode = req.query.vnp_ResponseCode;

  if (!verifyVnpayReturn(req.query)) {
    throw new ApiError(400, 'VNPay signature is invalid.', 'VNPAY_SIGNATURE_INVALID');
  }

  const transaction = await PaymentTransaction.findOne({ providerRef });

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  transaction.status = responseCode === '00' ? 'paid' : 'failed';
  transaction.paidAt = responseCode === '00' ? new Date() : null;
  await transaction.save();

  if (transaction.status === 'paid') {
    await enrollPaidStudent({ classId: transaction.class, userId: transaction.user });
    const invoice = await createOrReuseInvoice(transaction);
    await sendPaymentNotification(transaction, invoice);
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/payments?transaction=${transaction._id}&status=${transaction.status}`);
});

export const myPayments = asyncHandler(async (req, res) => {
  const transactions = await PaymentTransaction.find({ user: req.user._id })
    .populate('class', 'title startDate location coachName')
    .sort({ createdAt: -1 });
  const invoices = await Invoice.find({ transaction: { $in: transactions.map((item) => item._id) } });
  const invoiceMap = new Map(invoices.map((item) => [item.transaction.toString(), item]));

  res.json(transactions.map((item) => ({
    ...item.toObject(),
    invoice: invoiceMap.get(item._id.toString()) || null
  })));
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.invoiceId)
    .populate('user', 'name email')
    .populate('class', 'title startDate location')
    .populate('transaction');

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
  }

  if (req.user.role !== 'admin' && invoice.user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You cannot access this invoice', 'INVOICE_FORBIDDEN');
  }

  const buffer = createInvoicePdfBuffer({
    invoice,
    user: invoice.user,
    classItem: invoice.class,
    transaction: invoice.transaction
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});

export const joinWaitlist = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const existingEnrollment = await Enrollment.findOne({ class: classItem._id, user: req.user._id, ...activeEnrollmentFilter });
  if (existingEnrollment) {
    throw new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED');
  }

  const waitlistItem = await Waitlist.findOneAndUpdate(
    { class: classItem._id, user: req.user._id },
    { status: 'waiting', joinedAt: new Date(), promotedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const position = await Waitlist.countDocuments({
    class: classItem._id,
    status: 'waiting',
    joinedAt: { $lte: waitlistItem.joinedAt }
  });

  await writeAuditLog({
    actor: req.user._id,
    action: 'waitlist.joined',
    targetType: 'Class',
    targetId: classItem._id
  });

  res.status(201).json({ ...waitlistItem.toObject(), position });
});

export const leaveWaitlist = asyncHandler(async (req, res) => {
  await Waitlist.updateOne(
    { class: req.params.id, user: req.user._id, status: 'waiting' },
    { status: 'cancelled' }
  );
  res.json({ message: 'Left waitlist' });
});

export const getClassWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await Waitlist.find({ class: req.params.id, status: 'waiting' })
    .populate('user', 'name email')
    .sort({ joinedAt: 1 });
  res.json(waitlist.map((item, index) => ({ ...item.toObject(), position: index + 1 })));
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const existing = await Bookmark.findOne({ class: classItem._id, user: req.user._id });
  if (existing) {
    await existing.deleteOne();
    res.json({ bookmarked: false });
    return;
  }

  await Bookmark.create({ class: classItem._id, user: req.user._id });
  res.status(201).json({ bookmarked: true });
});

export const myBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user._id })
    .populate('class')
    .sort({ createdAt: -1 });
  res.json(bookmarks.filter((item) => item.class).map((item) => item.class));
});

export const myWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await Waitlist.find({ user: req.user._id, status: 'waiting' })
    .populate('class')
    .sort({ joinedAt: -1 });

  const items = await Promise.all(waitlist
    .filter((item) => item.class)
    .map(async (item) => {
      const position = await Waitlist.countDocuments({
        class: item.class._id,
        status: 'waiting',
        joinedAt: { $lte: item.joinedAt }
      });

      return {
        _id: item._id,
        joinedAt: item.joinedAt,
        position,
        class: item.class
      };
    }));

  res.json(items);
});

export const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ class: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

export const upsertReview = asyncHandler(async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be from 1 to 5', 'VALIDATION_ERROR', ['rating']);
  }

  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const reviewDelayHours = Number(process.env.CLASS_REVIEW_DELAY_HOURS || 2);
  const reviewAvailableAt = new Date(classItem.startDate.getTime() + reviewDelayHours * 60 * 60 * 1000);
  if (reviewAvailableAt > new Date()) {
    throw new ApiError(400, 'You can review after the class has finished.', 'CLASS_NOT_FINISHED');
  }

  const enrollment = await Enrollment.findOne({ class: classItem._id, user: req.user._id, ...activeEnrollmentFilter });
  if (!enrollment) {
    throw new ApiError(403, 'Only enrolled students can review this class.', 'REVIEW_NOT_ALLOWED');
  }

  const review = await Review.findOneAndUpdate(
    { class: classItem._id, user: req.user._id },
    { rating, comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('user', 'name');

  res.status(201).json(review);
});

export const getAttendance = asyncHandler(async (req, res) => {
  const [students, attendance] = await Promise.all([
    Enrollment.find({ class: req.params.id, ...activeEnrollmentFilter }).populate('user', 'name email'),
    Attendance.find({ class: req.params.id }).sort({ date: -1 })
  ]);

  res.json({ students, attendance });
});

export const markAttendance = asyncHandler(async (req, res) => {
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const records = Array.isArray(req.body.records) ? req.body.records : [];

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Attendance date is invalid', 'VALIDATION_ERROR', ['date']);
  }

  const saved = await Promise.all(records.map((record) => {
    if (!['present', 'absent', 'excused'].includes(record.status)) {
      throw new ApiError(400, 'Invalid attendance status', 'VALIDATION_ERROR', ['status']);
    }

    return Attendance.findOneAndUpdate(
      { class: req.params.id, user: record.user, date },
      { status: record.status, markedBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }));

  await writeAuditLog({
    actor: req.user._id,
    action: 'attendance.marked',
    targetType: 'Class',
    targetId: req.params.id,
    metadata: { count: saved.length }
  });

  res.json(saved);
});

export const createTransferRequest = asyncHandler(async (req, res) => {
  const toClass = req.body.toClass;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

  if (!mongoose.isValidObjectId(toClass)) {
    throw new ApiError(400, 'Target class is invalid', 'INVALID_OBJECT_ID', ['toClass']);
  }

  const enrollment = await Enrollment.findOne({ class: req.params.id, user: req.user._id, ...activeEnrollmentFilter });
  if (!enrollment) {
    throw new ApiError(403, 'You must be enrolled before requesting a transfer.', 'TRANSFER_NOT_ALLOWED');
  }

  if (toClass === req.params.id) {
    throw new ApiError(400, 'Target class must be different from the current class.', 'TRANSFER_SAME_CLASS', ['toClass']);
  }

  const targetClass = await ClassModel.findById(toClass);
  if (!targetClass) {
    throw new ApiError(404, 'Target class not found', 'CLASS_NOT_FOUND');
  }

  if (targetClass.startDate <= new Date()) {
    throw new ApiError(400, 'Target class has already started.', 'CLASS_ALREADY_STARTED', ['toClass']);
  }

  const targetStudents = await Enrollment.countDocuments({ class: targetClass._id, ...activeEnrollmentFilter });
  if (targetStudents >= targetClass.maxStudents) {
    throw new ApiError(409, 'Target class is full.', 'CLASS_FULL', ['toClass']);
  }

  const existingPending = await TransferRequest.findOne({
    user: req.user._id,
    fromClass: req.params.id,
    status: 'pending'
  });
  if (existingPending) {
    throw new ApiError(409, 'You already have a pending transfer request for this class.', 'TRANSFER_ALREADY_PENDING');
  }

  const request = await TransferRequest.create({
    user: req.user._id,
    fromClass: req.params.id,
    toClass,
    reason
  });

  res.status(201).json(request);
});

export const myTransfers = asyncHandler(async (req, res) => {
  const requests = await TransferRequest.find({ user: req.user._id })
    .populate('fromClass', 'title startDate')
    .populate('toClass', 'title startDate')
    .sort({ createdAt: -1 });
  res.json(requests);
});

export const listTransfers = asyncHandler(async (req, res) => {
  const requests = await TransferRequest.find()
    .populate('user', 'name email')
    .populate('fromClass', 'title startDate')
    .populate('toClass', 'title startDate maxStudents')
    .sort({ createdAt: -1 });
  res.json(requests);
});

export const decideTransfer = asyncHandler(async (req, res) => {
  const status = req.body.status;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Status must be approved or rejected', 'VALIDATION_ERROR', ['status']);
  }

  const request = await TransferRequest.findById(req.params.id);
  if (!request) {
    throw new ApiError(404, 'Transfer request not found', 'TRANSFER_NOT_FOUND');
  }

  if (request.status !== 'pending') {
    throw new ApiError(409, 'Transfer request has already been decided.', 'TRANSFER_ALREADY_DECIDED');
  }

  if (status === 'approved') {
    const currentStudents = await Enrollment.countDocuments({ class: request.toClass, ...activeEnrollmentFilter });
    const targetClass = await ClassModel.findById(request.toClass);
    if (!targetClass || currentStudents >= targetClass.maxStudents) {
      throw new ApiError(409, 'Target class is full or unavailable.', 'CLASS_FULL');
    }

    await Enrollment.updateOne({ class: request.fromClass, user: request.user }, { status: 'cancelled', cancelledAt: new Date() });
    await enrollPaidStudent({ classId: request.toClass, userId: request.user });
  }

  request.status = status;
  request.decidedBy = req.user._id;
  request.decidedAt = new Date();
  await request.save();

  await writeAuditLog({
    actor: req.user._id,
    action: `transfer.${status}`,
    targetType: 'TransferRequest',
    targetId: request._id
  });

  res.json(request);
});

export const adminMetrics = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [revenue, newStudents, upcomingClasses, classes, enrollmentCounts] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: monthStart, $lt: nextMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    mongoose.model('User').countDocuments({ role: 'user', createdAt: { $gte: monthStart, $lt: nextMonth } }),
    ClassModel.find({ startDate: { $gte: now } }).sort({ startDate: 1 }).limit(5),
    ClassModel.find({}),
    Enrollment.aggregate([
      { $match: activeEnrollmentFilter },
      { $group: { _id: '$class', count: { $sum: 1 } } }
    ])
  ]);

  const countMap = new Map(enrollmentCounts.map((item) => [item._id.toString(), item.count]));
  const totalCapacity = classes.reduce((sum, item) => sum + item.maxStudents, 0);
  const totalEnrollment = classes.reduce((sum, item) => sum + (countMap.get(item._id.toString()) || 0), 0);

  res.json({
    monthRevenue: revenue[0]?.total || 0,
    paidTransactions: revenue[0]?.count || 0,
    newStudents,
    upcomingClasses,
    fillRate: totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : null
  });
});

function parseReportRange(query) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = query.startDate ? new Date(query.startDate) : defaultStart;
  const end = query.endDate ? new Date(query.endDate) : defaultEnd;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, 'Report date range is invalid', 'VALIDATION_ERROR', ['startDate', 'endDate']);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    throw new ApiError(400, 'Start date must be before end date', 'VALIDATION_ERROR', ['startDate', 'endDate']);
  }

  return { start, end };
}

export const adminReports = asyncHandler(async (req, res) => {
  const { start, end } = parseReportRange(req.query);

  const [
    revenue,
    newEnrollments,
    cancelledEnrollments,
    activeStudents,
    classesInRange,
    attendanceSummary,
    revenueByDay,
    enrollmentByDay,
    classRevenue
  ] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Enrollment.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Enrollment.countDocuments({ status: 'cancelled', cancelledAt: { $gte: start, $lte: end } }),
    Enrollment.distinct('user', activeEnrollmentFilter),
    ClassModel.find({ startDate: { $gte: start, $lte: end } }).sort({ startDate: 1 }),
    Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Enrollment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          enrollments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    PaymentTransaction.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$class', revenue: { $sum: '$amount' }, paidTransactions: { $sum: 1 } } }
    ])
  ]);

  const classIds = classesInRange.map((item) => item._id);
  const [classEnrollments, classAttendance] = await Promise.all([
    Enrollment.aggregate([
      { $match: { class: { $in: classIds }, ...activeEnrollmentFilter } },
      { $group: { _id: '$class', activeEnrollments: { $sum: 1 } } }
    ]),
    Attendance.aggregate([
      { $match: { class: { $in: classIds }, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$class',
          attendanceRecords: { $sum: 1 },
          presentRecords: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
        }
      }
    ])
  ]);

  const revenueMap = new Map(classRevenue.map((item) => [item._id.toString(), item]));
  const enrollmentMap = new Map(classEnrollments.map((item) => [item._id.toString(), item.activeEnrollments]));
  const attendanceMap = new Map(classAttendance.map((item) => [item._id.toString(), item]));
  const attendanceCounts = attendanceSummary.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
  const attendanceTotal = Object.values(attendanceCounts).reduce((sum, count) => sum + count, 0);
  const presentTotal = attendanceCounts.present || 0;

  res.json({
    range: {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    },
    summary: {
      revenueTotal: revenue[0]?.total || 0,
      paidTransactions: revenue[0]?.count || 0,
      newEnrollments,
      cancelledEnrollments,
      activeStudents: activeStudents.length,
      classesStarted: classesInRange.length,
      attendanceMarked: attendanceTotal,
      presentRate: attendanceTotal > 0 ? Math.round((presentTotal / attendanceTotal) * 100) : null
    },
    revenueByDay: revenueByDay.map((item) => ({
      date: item._id,
      revenue: item.revenue,
      transactions: item.transactions
    })),
    enrollmentByDay: enrollmentByDay.map((item) => ({
      date: item._id,
      enrollments: item.enrollments
    })),
    classBreakdown: classesInRange.map((item) => {
      const key = item._id.toString();
      const revenueItem = revenueMap.get(key);
      const attendanceItem = attendanceMap.get(key);
      const activeEnrollments = enrollmentMap.get(key) || 0;
      return {
        _id: item._id,
        title: item.title,
        coachName: item.coachName,
        level: item.level,
        startDate: item.startDate,
        maxStudents: item.maxStudents,
        activeEnrollments,
        fillRate: item.maxStudents > 0 ? Math.round((activeEnrollments / item.maxStudents) * 100) : null,
        revenue: revenueItem?.revenue || 0,
        paidTransactions: revenueItem?.paidTransactions || 0,
        presentRate: attendanceItem?.attendanceRecords
          ? Math.round((attendanceItem.presentRecords / attendanceItem.attendanceRecords) * 100)
          : null
      };
    })
  });
});

export const auditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(logs);
});
