import nodemailer from 'nodemailer';

let transporterPromise = null;

async function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    }));
  }
  return transporterPromise;
}

export async function sendEmail({ to, subject, text }) {
  const payload = {
    to,
    subject,
    text
  };

  const transporter = await getTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'Lin-Badminton <no-reply@lin-badminton.local>',
      to,
      subject,
      text
    });
    return {
      delivered: true,
      mode: 'smtp',
      payload
    };
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log('Email notification queued:', payload);
  }

  return {
    delivered: false,
    mode: 'console',
    payload
  };
}

export function resetPasswordEmail({ name, resetUrl }) {
  return [
    `Hi ${name || 'there'},`,
    '',
    'You requested a password reset for your Lin-Badminton account.',
    `Reset your password here: ${resetUrl}`,
    '',
    'This link expires in 1 hour. If you did not request this, you can ignore this email.'
  ].join('\n');
}

export function paymentConfirmationEmail({ name, classTitle, amount, currency, invoiceNumber }) {
  return [
    `Hi ${name || 'there'},`,
    '',
    `Your payment for ${classTitle || 'your class'} was confirmed.`,
    `Amount: ${Number(amount || 0).toLocaleString('vi-VN')} ${currency || 'VND'}`,
    invoiceNumber ? `Invoice: ${invoiceNumber}` : '',
    '',
    'Thank you for training with Lin-Badminton.'
  ].filter(Boolean).join('\n');
}
