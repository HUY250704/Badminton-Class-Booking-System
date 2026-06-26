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
