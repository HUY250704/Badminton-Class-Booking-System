import api from '../api/axios'
import { useEffect, useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { firebaseAuth, firebaseGoogleProvider, isFirebaseConfigured } from '../config/firebase'

export const AUTH_CHANGE_EVENT = 'auth-change'

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function saveAuth(payload) {
  if (payload?.token) {
    localStorage.setItem('token', payload.token)
    localStorage.setItem('user', JSON.stringify(payload.user))
    notifyAuthChange()
  }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  notifyAuthChange()
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export function useAuthUser() {
  const [user, setUser] = useState(() => getUser())

  useEffect(() => {
    function refreshUser() {
      setUser(getUser())
    }

    function handleStorage(event) {
      if (event.key === null || event.key === 'user' || event.key === 'token') {
        refreshUser()
      }
    }

    window.addEventListener(AUTH_CHANGE_EVENT, refreshUser)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, refreshUser)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return user
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email: email.trim().toLowerCase(), password })
  saveAuth(res.data)
  return res.data
}

export async function register(data) {
  const res = await api.post('/auth/register', {
    ...data,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase()
  })
  saveAuth(res.data)
  return res.data
}

export async function forgotPassword(email) {
  const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
  return res.data
}

export async function resetPassword(token, password) {
  const res = await api.post('/auth/reset-password', { token, password })
  saveAuth(res.data)
  return res.data
}

export async function googleAuthUrl() {
  if (isFirebaseConfigured() && firebaseAuth) {
    try {
      const result = await signInWithPopup(firebaseAuth, firebaseGoogleProvider)
      const idToken = await result.user.getIdToken()
      const res = await api.post('/auth/firebase', { idToken })
      saveAuth(res.data)
      return null
    } catch (error) {
      if (error?.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication chưa được bật cho project lin-badminton. Vào Firebase Console > Authentication > Get started, bật Google provider, rồi thử lại.')
      }

      throw error
    }
  }

  if (import.meta.env.VITE_AUTH_GOOGLE_OAUTH === 'true') {
    const res = await api.get('/auth/google/url')
    return res.data.authUrl
  }

  throw new Error('Firebase Web config is missing. Fill VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in frontend/.env.')
}

export async function legacyGoogleAuthUrl() {
  const res = await api.get('/auth/google/url')
  return res.data.authUrl
}

export async function googleCallback(code) {
  const res = await api.post('/auth/google/callback', { code })
  saveAuth(res.data)
  return res.data
}

export async function updateProfile(data) {
  const res = await api.patch('/auth/me', data)
  const current = getUser() || {}
  localStorage.setItem('user', JSON.stringify({ ...current, ...res.data }))
  notifyAuthChange()
  return res.data
}

export async function changePassword(currentPassword, newPassword) {
  const res = await api.patch('/auth/me/password', { currentPassword, newPassword })
  saveAuth(res.data)
  return res.data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    clearAuth()
  }
}
