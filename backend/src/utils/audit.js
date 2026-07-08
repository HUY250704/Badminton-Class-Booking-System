import AuditLog from '../models/AuditLog.js';

export async function writeAuditLog({ actor = null, action, targetType, targetId = '', metadata = {} }) {
  try {
    await AuditLog.create({
      actor,
      action,
      targetType,
      targetId: targetId?.toString?.() || targetId || '',
      metadata
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Could not write audit log:', error.message);
    }
  }
}
