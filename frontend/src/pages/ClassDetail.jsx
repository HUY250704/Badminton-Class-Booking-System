import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, UsersRound, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getUser } from '../hooks/useAuth'
import { capacityPercent, capacityText, classImage, daysUntil, formatDateTime, formatTime, levelLabel } from '../utils/classUi'

export default function ClassDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = getUser()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['class', id],
    queryFn: () => api.get(`/classes/${id}`).then((r) => r.data)
  })

  const enroll = useMutation({
    mutationFn: () => api.post(`/classes/${id}/enroll`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['class', id] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
      navigate('/booking-success', { state: { classItem: data } })
    }
  })

  const cancel = useMutation({
    mutationFn: () => api.delete(`/classes/${id}/enroll`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['class', id] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/classes/${id}`).then((r) => r.data),
    onSuccess: () => navigate('/classes')
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{error?.response?.data?.message || 'Could not load class'}</div>

  const isFull = data.currentStudents >= data.maxStudents
  const percent = capacityPercent(data.currentStudents, data.maxStudents)
  const actionError = enroll.error || cancel.error || remove.error

  return (
    <div className="stack">
      <Link className="button button-secondary button-fit" to="/classes"><ArrowLeft size={18} /> Back to classes</Link>
      <div className="detail-layout">
        <section className="detail-hero page-card">
          <img src={classImage(data.level)} alt={`${data.title} badminton training`} />
          <div className="detail-overlay">
            <div className="overlay-badges">
              <span className={`level-badge ${data.level}`}>{levelLabel(data.level)}</span>
              {data.isEnrolled && <span className="status-badge success"><CheckCircle2 size={16} /> Booked</span>}
            </div>
            <h1>{data.title}</h1>
            <p>{data.description}</p>
          </div>
        </section>

        <aside className="booking-panel page-card">
          <div className="panel-header">
            <span className="eyebrow">Booking status</span>
            <h2>{data.isEnrolled ? 'You are in' : capacityText(data.currentStudents, data.maxStudents)}</h2>
            <p className="muted">{daysUntil(data.startDate)} at {formatTime(data.startDate)}</p>
          </div>
          <div className="capacity-row">
            <span>{data.currentStudents}/{data.maxStudents} enrolled</span>
            <strong>{percent}%</strong>
          </div>
          <div className="progress-track large">
            <div className={percent >= 100 ? 'progress-fill full' : 'progress-fill'} style={{ width: `${percent}%` }} />
          </div>

          {!user && (
            <div className="button-stack">
              <Link className="button button-primary button-full" to="/login">Login to Enroll</Link>
              <Link className="button button-secondary button-full" to="/register">Create Account</Link>
            </div>
          )}
          {user?.role !== 'admin' && !data.isEnrolled && (
            <button className="button button-primary button-full" disabled={!user || isFull || enroll.isPending} onClick={() => enroll.mutate()}>
              {isFull ? 'Class Full' : enroll.isPending ? 'Enrolling...' : 'Enroll Now'}
            </button>
          )}
          {user?.role !== 'admin' && data.isEnrolled && (
            <button className="button button-secondary button-full" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? 'Cancelling...' : 'Cancel Enrollment'}
            </button>
          )}
          {user?.role === 'admin' && (
            <div className="button-stack">
              <Link className="button button-dark button-full" to={`/admin/${data._id}/students`}>View Students</Link>
              <Link className="button button-secondary button-full" to={`/admin/create?id=${data._id}`}>Edit Class</Link>
              <button className="button button-danger button-full" disabled={remove.isPending} onClick={() => {
                if (confirm('Delete this class?')) remove.mutate()
              }}>
                {remove.isPending ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          )}
          {actionError && <div className="alert alert-error">{actionError.response?.data?.message || 'Operation failed'}</div>}
        </aside>

        <section className="page-card info-grid">
          <div><UserRound size={20} /><span>Coach</span><strong>{data.coachName}</strong></div>
          <div><CalendarDays size={20} /><span>Start</span><strong>{formatDateTime(data.startDate)}</strong></div>
          <div><Clock3 size={20} /><span>Schedule</span><strong>{data.schedule}</strong></div>
          <div><MapPin size={20} /><span>Location</span><strong>{data.location}</strong></div>
          <div><UsersRound size={20} /><span>Capacity</span><strong>{data.currentStudents}/{data.maxStudents}</strong></div>
        </section>
      </div>
    </div>
  )
}
