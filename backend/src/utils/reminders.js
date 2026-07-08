import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import { sendEmail } from './email.js';

const sentReminders = new Set();

function reminderText({ name, classItem, label }) {
  return [
    `Hi ${name || 'there'},`,
    '',
    `Reminder: ${classItem.title} starts in ${label}.`,
    `Schedule: ${classItem.schedule}`,
    `Location: ${classItem.location}`,
    '',
    'See you on court.'
  ].join('\n');
}

async function sendWindowReminders({ now, label, targetMs, toleranceMs }) {
  const from = new Date(now.getTime() + targetMs - toleranceMs);
  const to = new Date(now.getTime() + targetMs + toleranceMs);
  const classes = await ClassModel.find({ startDate: { $gte: from, $lte: to } });

  await Promise.all(classes.map(async (classItem) => {
    const enrollments = await Enrollment.find({ class: classItem._id, status: { $ne: 'cancelled' } })
      .populate('user', 'name email');

    await Promise.all(enrollments.map(async (enrollment) => {
      if (!enrollment.user?.email) return;
      const key = `${label}:${classItem._id}:${enrollment.user._id}`;
      if (sentReminders.has(key)) return;

      sentReminders.add(key);
      await sendEmail({
        to: enrollment.user.email,
        subject: `Class reminder - ${classItem.title}`,
        text: reminderText({ name: enrollment.user.name, classItem, label })
      });
    }));
  }));
}

export async function sendClassReminders() {
  const now = new Date();
  const toleranceMs = Number(process.env.REMINDER_TOLERANCE_MINUTES || 10) * 60 * 1000;

  await sendWindowReminders({
    now,
    label: '1 day',
    targetMs: 24 * 60 * 60 * 1000,
    toleranceMs
  });

  await sendWindowReminders({
    now,
    label: '1 hour',
    targetMs: 60 * 60 * 1000,
    toleranceMs
  });
}

export function startClassReminderScheduler() {
  if (process.env.USE_MEMORY_DB === 'true' || process.env.DISABLE_CLASS_REMINDERS === 'true') return;

  const intervalMs = Number(process.env.REMINDER_INTERVAL_MS || 10 * 60 * 1000);
  setInterval(() => {
    sendClassReminders().catch((error) => {
      console.warn('Class reminder job failed:', error.message);
    });
  }, intervalMs).unref();
}
