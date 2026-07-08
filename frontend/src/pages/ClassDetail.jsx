import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, CreditCard, Heart, MapPin, Star, UsersRound, UserRound } from 'lucide-react'
import api from '../api/axios'
import { broadcastEnrollmentChange, invalidateEnrollmentQueries } from '../api/enrollmentEvents'
import { getApiErrorMessage } from '../api/errors'
import { getUser } from '../hooks/useAuth'
import { capacityPercent, capacityText, classImage, daysUntil, formatDateTime, formatTime, levelLabel } from '../utils/classUi'

export default function ClassDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = getUser()
  const [actionLock, setActionLock] = useState('')
  const [notice, setNotice] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['class', id],
    queryFn: () => api.get(`/classes/${id}`).then((r) => r.data)
  })

  const reviews = useQuery({
    queryKey: ['class-reviews', id],
    queryFn: () => api.get(`/classes/${id}/reviews`).then((r) => r.data)
  })

  const enroll = useMutation({
    mutationFn: () => api.post(`/classes/${id}/enroll`).then((r) => r.data),
    onSuccess: () => {
      invalidateEnrollmentQueries(qc, id)
      broadcastEnrollmentChange(id)
      localStorage.setItem('lastBookingClassId', id)
      navigate(`/booking-success?classId=${id}`, { state: { classItem: data } })
    },
    onSettled: () => setActionLock('')
  })

  const cancel = useMutation({
    mutationFn: () => api.delete(`/classes/${id}/enroll`).then((r) => r.data),
    onSuccess: (result) => {
      invalidateEnrollmentQueries(qc, id)
      broadcastEnrollmentChange(id)
      setNotice(result?.alreadyCancelled ? 'This class was already cancelled earlier.' : 'Enrollment cancelled.')
    },
    onSettled: () => setActionLock('')
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/classes/${id}`).then((r) => r.data),
    onSuccess: () => {
      invalidateEnrollmentQueries(qc, id)
      navigate('/classes')
    }
  })

  const payment = useMutation({
    mutationFn: () => api.post(`/classes/${id}/payments`).then((r) => r.data),
    onSuccess: (result) => {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    }
  })

  const waitlist = useMutation({
    mutationFn: () => api.post(`/classes/${id}/waitlist`).then((r) => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['class', id] })
      setNotice(`You joined the waitlist at position ${result.position}.`)
    }
  })

  const bookmark = useMutation({
    mutationFn: () => api.post(`/classes/${id}/bookmark`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', id] })
      qc.invalidateQueries({ queryKey: ['my-bookmarks'] })
    }
  })

  const review = useMutation({
    mutationFn: () => api.post(`/classes/${id}/reviews`, { rating, comment: reviewText }).then((r) => r.data),
    onSuccess: () => {
      setReviewText('')
      qc.invalidateQueries({ queryKey: ['class-reviews', id] })
      qc.invalidateQueries({ queryKey: ['class', id] })
    }
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load class')}</div>
  if (!data) return <div className="alert alert-error">Could not load class details.</div>

  const isFull = (data?.currentStudents ?? 0) >= (data?.maxStudents ?? 1)
  const hasStarted = data?.startDate ? new Date(data.startDate) <= new Date() : false
  const reviewAvailableAt = data?.startDate ? new Date(new Date(data.startDate).getTime() + 2 * 60 * 60 * 1000) : null
  const canReview = Boolean(reviewAvailableAt && reviewAvailableAt <= new Date())
  const percent = capacityPercent(data?.currentStudents, data?.maxStudents)
  const actionError = enroll.error || cancel.error || remove.error || payment.error || waitlist.error || bookmark.error || review.error
  const isEnrolling = actionLock === 'enroll' || enroll.isPending
  const isCancelling = actionLock === 'cancel' || cancel.isPending
  const price = Number(data.price ?? 500000).toLocaleString('vi-VN')

  function handleEnroll() {
    if (actionLock || enroll.isPending || isFull || hasStarted) return
    setNotice('')
    setActionLock('enroll')
    enroll.mutate()
  }

  function handleCancel() {
    if (actionLock || cancel.isPending) return
    if (!confirm('Are you sure you want to cancel this class?')) return
    setNotice('')
    setActionLock('cancel')
    cancel.mutate()
  }

  return (
    <div className="stack">
      <Link className="button button-secondary button-fit" to="/classes"><ArrowLeft size={18} /> Back to classes</Link>
      <div className="detail-layout">
        <section className="detail-hero page-card">
          <img src={data.imageUrl || classImage(data.level)} alt={`${data.title} badminton training`} />
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
            <span>Class fee</span>
            <strong>{price} VND</strong>
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
            <div className="button-stack">
              <button className="button button-primary button-full" disabled={!user || isFull || hasStarted || payment.isPending} onClick={() => payment.mutate()}>
                <CreditCard size={18} /> {payment.isPending ? 'Preparing payment...' : 'Pay with VNPay'}
              </button>
              <button className="button button-secondary button-full" disabled={!user || isFull || hasStarted || isEnrolling} onClick={handleEnroll}>
                {isFull ? 'Class Full' : hasStarted ? 'Class Started' : isEnrolling ? 'Enrolling...' : 'Enroll without payment'}
              </button>
              {isFull && (
                <button className="button button-dark button-full" disabled={!user || data.userWaitlisted || waitlist.isPending} onClick={() => waitlist.mutate()}>
                  {data.userWaitlisted ? `On waitlist (${data.waitlistCount})` : waitlist.isPending ? 'Joining waitlist...' : 'Join Waitlist'}
                </button>
              )}
            </div>
          )}
          {user?.role !== 'admin' && (
            <button className="button button-secondary button-full" disabled={!user || bookmark.isPending} onClick={() => bookmark.mutate()}>
              <Heart size={18} /> {data.isBookmarked ? 'Remove Bookmark' : 'Bookmark Class'}
            </button>
          )}
          {user?.role !== 'admin' && data.isEnrolled && (
            <button className="button button-secondary button-full" disabled={isCancelling} onClick={handleCancel}>
              {isCancelling ? 'Cancelling...' : 'Cancel Enrollment'}
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
          {notice && <div className="alert alert-success">{notice}</div>}
          {actionError && <div className="alert alert-error">{getApiErrorMessage(actionError, 'Operation failed')}</div>}
        </aside>

        <section className="page-card info-grid">
          <div><UserRound size={20} /><span>Coach</span><strong>{data.coach?.name || data.coachName}</strong></div>
          <div><CalendarDays size={20} /><span>Start</span><strong>{formatDateTime(data.startDate)}</strong></div>
          <div><Clock3 size={20} /><span>Schedule</span><strong>{data.schedule}</strong></div>
          <div><MapPin size={20} /><span>Location</span><strong>{data.location}</strong></div>
          <div><UsersRound size={20} /><span>Capacity</span><strong>{data.currentStudents}/{data.maxStudents}</strong></div>
          <div><Star size={20} /><span>Rating</span><strong>{data.averageRating ? `${data.averageRating}/5 (${data.reviewCount})` : 'No reviews'}</strong></div>
        </section>
      </div>

      <section className="page-card review-panel">
        <div className="panel-header">
          <span className="eyebrow">Class feedback</span>
          <h2>Reviews</h2>
        </div>
        {data.coach?.bio && (
          <div className="alert alert-success">
            <strong>{data.coach.name}</strong> - {data.coach.bio}
          </div>
        )}
        {user?.role !== 'admin' && data.isEnrolled && canReview && (
          <form className="review-form" onSubmit={(e) => { e.preventDefault(); review.mutate() }}>
            <label className="field">
              <span>Rating</span>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
            </label>
            <label className="field">
              <span>Comment</span>
              <textarea rows="3" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience" />
            </label>
            <button className="button button-primary button-fit" disabled={review.isPending} type="submit">Submit Review</button>
          </form>
        )}
        <div className="review-list">
          {(reviews.data || []).map((item) => (
            <article className="review-item" key={item._id}>
              <strong>{item.user?.name || 'Student'} - {item.rating}/5</strong>
              <p>{item.comment || 'No comment'}</p>
            </article>
          ))}
          {!reviews.isLoading && (reviews.data || []).length === 0 && <p className="muted">No reviews yet.</p>}
        </div>
      </section>
    </div>
  )
}
