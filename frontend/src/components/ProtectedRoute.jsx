import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthUser } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const user = useAuthUser()
  if (!user) return <Navigate to="/login" replace />
  return children
}
