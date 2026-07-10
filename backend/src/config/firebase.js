import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const defaultServiceAccountPath = './lin-badminton-firebase-adminsdk-fbsvc-a0a38da221.json';
const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

function resolveServiceAccountPath(configuredValue) {
  return path.isAbsolute(configuredValue)
    ? configuredValue
    : path.resolve(backendRoot, configuredValue);
}

function serviceAccountFromConfiguredValue() {
  const configuredValue = (configuredServiceAccountPath || defaultServiceAccountPath).trim();

  try {
    if (configuredValue.startsWith('{')) {
      return JSON.parse(configuredValue);
    }

    return JSON.parse(fs.readFileSync(resolveServiceAccountPath(configuredValue), 'utf8'));
  } catch {
    throw new ApiError(
      500,
      `FIREBASE_SERVICE_ACCOUNT must be valid JSON or a readable service account JSON file path: ${configuredValue}`,
      'FIREBASE_CONFIG_INVALID'
    );
  }
}

function serviceAccountFromEnvFields() {
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
    const hasEnvFields =
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY;
    const hasServiceAccountFile =
      configuredServiceAccountPath || fs.existsSync(resolveServiceAccountPath(defaultServiceAccountPath));
    const serviceAccount = hasEnvFields
      ? serviceAccountFromEnvFields()
      : hasServiceAccountFile
        ? serviceAccountFromConfiguredValue()
        : serviceAccountFromEnvFields();

    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  return getAuth();
}
