import api from '../api/axios'

export function saveAuth(payload) {
  if (payload?.token) {
    localStorage.setItem('token', payload.token)
    localStorage.setItem('user', JSON.stringify(payload.user))
  }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
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
