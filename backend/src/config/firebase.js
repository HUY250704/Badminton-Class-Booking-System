import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';

function serviceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const configuredValue = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

    try {
      if (configuredValue.startsWith('{')) {
        return JSON.parse(configuredValue);
      }

      const serviceAccountPath = path.isAbsolute(configuredValue)
        ? configuredValue
        : path.resolve(process.cwd(), configuredValue);

      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } catch {
      throw new ApiError(
        500,
        'FIREBASE_SERVICE_ACCOUNT must be valid JSON or a readable service account JSON file path',
        'FIREBASE_CONFIG_INVALID'
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(
      501,
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      'FIREBASE_NOT_CONFIGURED'
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function firebaseAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccountFromEnv())
    });
  }

  return getAuth();
}
