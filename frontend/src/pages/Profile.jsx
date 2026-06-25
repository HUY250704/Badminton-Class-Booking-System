import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Mail, ShieldCheck, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../hooks/useAuth'

export default function Profile() {
  const user = getUser()
  const isStudent = user?.role !== 'admin'
  const displayName = user?.role === 'admin' ? 'Admin' : user?.name
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'User'
  const { data = [] } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/classes/my/enrollments').then((r) => r.data),
    enabled: isStudent
  })

  const upcomingCount = data.filter((item) => new Date(item.class.startDate) >= new Date()).length

  return (
    <div className="profile-layout">
      <section className="profile-hero page-card">
        <div className="profile-avatar"><UserRound size={42} /></div>
        <div>
          <span className="eyebrow">{roleLabel}</span>
          <h1>{displayName || 'Lin-Badminton Member'}</h1>
          <p><Mail size={18} /> {user?.email || 'No email available'}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Role</span><strong>{roleLabel}</strong></div>
        <div className="stat-card"><span>Booked</span><strong>{isStudent ? data.length : 'Admin'}</strong></div>
        <div className="stat-card"><span>Upcoming</span><strong>{isStudent ? upcomingCount : 'All'}</strong></div>
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">Account</span>
          <h2>Quick Actions</h2>
        </div>
        <div className="profile-actions">
          {user?.role === 'admin' ? (
            <Link className="button button-dark" to="/admin"><ShieldCheck size={18} /> Open Admin Portal</Link>
          ) : (
            <Link className="button button-dark" to="/my/enrollments"><CalendarDays size={18} /> View My Classes</Link>
          )}
          <Link className="button button-secondary" to="/classes">Explore Classes</Link>
        </div>
      </section>
    </div>
  )
}
