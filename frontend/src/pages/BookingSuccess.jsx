import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, CheckCircle2, MapPin, UserRound, UsersRound } from 'lucide-react'
import { formatDateTime } from '../utils/classUi'

export default function BookingSuccess() {
  const location = useLocation()
  const klass = location.state?.classItem

  return (
    <div className="success-page">
      <section className="success-card page-card">
        <div className="success-icon"><CheckCircle2 size={42} /></div>
        <span className="eyebrow">Booking confirmed</span>
        <h1>You are ready for court</h1>
        <p className="muted">Your class enrollment has been saved. You can review or cancel it from My Classes.</p>

        <div className="success-details">
          <div><UserRound size={20} /><span>Class</span><strong>{klass?.title || 'Selected class'}</strong></div>
          <div><CalendarDays size={20} /><span>Start</span><strong>{formatDateTime(klass?.startDate)}</strong></div>
          <div><MapPin size={20} /><span>Location</span><strong>{klass?.location || 'Class location'}</strong></div>
          <div><UsersRound size={20} /><span>Coach</span><strong>{klass?.coachName || 'Coach'}</strong></div>
        </div>

        <div className="form-actions success-actions">
          <Link className="button button-dark" to="/my/enrollments">View My Classes</Link>
          <Link className="button button-secondary" to="/classes">Explore More</Link>
        </div>
      </section>
    </div>
  )
}
