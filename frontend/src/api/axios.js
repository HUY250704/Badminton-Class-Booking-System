import axios from 'axios'
import { queryClient } from './queryClient'

const AUTH_CHANGE_EVENT = 'auth-change'
const PUBLIC_AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']

function isPublicAuthPath(pathname) {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
      sessionStorage.setItem('authMessage', 'Session expired. Please log in again.')
      queryClient.clear()

      if (!isPublicAuthPath(window.location.pathname) && !error.config?.skipAuthRedirect) {
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default api
