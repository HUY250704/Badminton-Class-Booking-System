import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import ClassList from './pages/ClassList'
import ClassDetail from './pages/ClassDetail'
import MyEnrollments from './pages/MyEnrollments'
import Profile from './pages/Profile'
import BookingSuccess from './pages/BookingSuccess'
import AdminDashboard from './pages/AdminDashboard'
import AdminCreateClass from './pages/AdminCreateClass'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Header from './components/Header'
import AdminStudents from './pages/AdminStudents'
import NotFound from './pages/NotFound'
import { ENROLLMENT_EVENT_KEY, invalidateEnrollmentQueries } from './api/enrollmentEvents'

export default function App() {
  const qc = useQueryClient()

  useEffect(() => {
    function handlePayload(payload) {
      invalidateEnrollmentQueries(qc, payload?.classId)
    }

    function handleStorage(event) {
      if (event.key !== ENROLLMENT_EVENT_KEY || !event.newValue) return
      try {
        handlePayload(JSON.parse(event.newValue))
      } catch {
        handlePayload()
      }
    }

    let channel
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(ENROLLMENT_EVENT_KEY)
      channel.onmessage = (event) => handlePayload(event.data)
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      channel?.close()
    }
  }, [qc])

  return (
    <div className="app-shell">
      <Header />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/classes" element={<ClassList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/classes/:id" element={<ClassDetail />} />
          <Route path="/my/enrollments" element={<ProtectedRoute><MyEnrollments /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/booking-success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/create" element={<AdminRoute><AdminCreateClass /></AdminRoute>} />
          <Route path="/admin/:id/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
