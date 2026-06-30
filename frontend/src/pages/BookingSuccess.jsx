import React from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, MapPin, UserRound, UsersRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../utils/classUi'

export default function BookingSuccess() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const stateClass = location.state?.classItem
  const classId = searchParams.get('classId') || stateClass?._id || localStorage.getItem('lastBookingClassId')
  const { data, isError, error } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => api.get(`/classes/${classId}`).then((r) => r.data),
    enabled: Boolean(classId),
    initialData: stateClass
  })
  const klass = data || stateClass

  return (
    <div className="success-page">
      <section className="success-card page-card">
        <div className="success-icon"><CheckCircle2 size={42} /></div>
        <span className="eyebrow">Booking confirmed</span>
        <h1>You are ready for court</h1>
        <p className="muted">Your class enrollment has been saved. You can review or cancel it from My Classes.</p>
        {isError && <div className="alert alert-error">{getApiErrorMessage(error, 'Could not refresh class details')}</div>}

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
