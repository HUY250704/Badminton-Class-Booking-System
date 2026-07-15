import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApiError } from '../utils/ApiError.js';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw || !raw.trim()) {
    throw new ApiError(
      501,
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set.',
      'FIREBASE_NOT_CONFIGURED'
    );
  }

  const value = raw.trim();

  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(
      500,
      'FIREBASE_SERVICE_ACCOUNT must be valid JSON.',
      'FIREBASE_CONFIG_INVALID'
    );
  }
}

export function firebaseAuth() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return getAuth();
}