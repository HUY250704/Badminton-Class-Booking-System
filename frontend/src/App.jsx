import React from 'react'
import { Routes, Route } from 'react-router-dom'
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

export default function App() {
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
        </Routes>
      </main>
    </div>
  )
}
