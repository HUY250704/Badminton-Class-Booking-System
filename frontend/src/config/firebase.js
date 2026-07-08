import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

function hasValue(value) {
  return Boolean(value && value.trim() && value.trim() !== '...')
}

export function isFirebaseConfigured() {
  return [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId].every(hasValue)
}

const app = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null

export const firebaseGoogleProvider = new GoogleAuthProvider()
firebaseGoogleProvider.setCustomParameters({ prompt: 'select_account' })

export const firebaseAuth = app ? getAuth(app) : null
