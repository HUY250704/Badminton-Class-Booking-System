import axios from 'axios'
import { queryClient } from './queryClient'

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
      queryClient.clear()

      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default api
