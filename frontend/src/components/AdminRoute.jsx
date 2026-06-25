import React from 'react'
import { Navigate } from 'react-router-dom'
import { getUser } from '../hooks/useAuth'

export default function AdminRoute({ children }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/classes" replace />
  return children
}
