import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, CreditCard, Heart, MapPin, Star, UsersRound, UserRound } from 'lucide-react'
import api from '../api/axios'
import { broadcastEnrollmentChange, invalidateEnrollmentQueries } from '../api/enrollmentEvents'
import { getApiErrorMessage } from '../api/errors'
import { getUser } from '../hooks/useAuth'
import { capacityPercent, capacityText, classImage, daysUntil, formatDateTime, formatTime, levelLabel, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

export default function ClassDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = getUser()
  const { language, t } = useTranslation()
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
      setNotice(result?.alreadyCancelled ? t('alreadyCancelled') : t('enrollmentCancelled'))
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
      setNotice(`${t('joinedWaitlistPosition')} ${result.position}.`)
    }
  })

  const leaveWaitlist = useMutation({
    mutationFn: () => api.delete(`/classes/${id}/waitlist`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class", id] });
      setNotice(t("leftWaitlist"));
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
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, t('couldNotLoadClass'))}</div>
  if (!data) return <div className="alert alert-error">{t('couldNotLoadClassDetails')}</div>

  const classItem = localizedClass(data, language)

  const isFull = (classItem?.currentStudents ?? 0) >= (classItem?.maxStudents ?? 1)
  const reviewAvailableAt = classItem?.startDate ? new Date(new Date(classItem.startDate).getTime() + 2 * 60 * 60 * 1000) : null
  const canReview = Boolean(reviewAvailableAt && reviewAvailableAt <= new Date())
  const percent = capacityPercent(classItem?.currentStudents, classItem?.maxStudents)
  const actionError = enroll.error || cancel.error || remove.error || payment.error || waitlist.error || leaveWaitlist.error || bookmark.error || review.error
  const isEnrolling = actionLock === 'enroll' || enroll.isPending
  const isCancelling = actionLock === 'cancel' || cancel.isPending
  const price = Number(classItem.price ?? 500000).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')

  function handleEnroll() {
    if (actionLock || enroll.isPending || isFull) return
    setNotice('')
    setActionLock('enroll')
    enroll.mutate()
  }

  function handleCancel() {
    if (actionLock || cancel.isPending) return
    if (!confirm(t('confirmCancelClass'))) return
    setNotice('')
    setActionLock('cancel')
    cancel.mutate()
  }

  return (
    <div className="stack">
      <Link className="button button-secondary button-fit" to="/classes"><ArrowLeft size={18} /> {t('backToClasses')}</Link>
      <div className="detail-layout">
        <section className="detail-hero page-card">
          <img src={classItem.imageUrl || classImage(classItem.level)} alt={`${classItem.title} badminton training`} />
          <div className="detail-overlay">
            <div className="overlay-badges">
              <span className={`level-badge ${classItem.level}`}>{levelLabel(classItem.level)}</span>
              {classItem.isEnrolled && <span className="status-badge success"><CheckCircle2 size={16} /> {t('booked')}</span>}
            </div>
            <h1>{classItem.title}</h1>
            <p>{classItem.description}</p>
          </div>
        </section>

        <aside className="booking-panel page-card">
          <div className="panel-header">
            <span className="eyebrow">{t('bookingStatus')}</span>
            <h2>{classItem.isEnrolled ? t('youAreIn') : capacityText(classItem.currentStudents, classItem.maxStudents)}</h2>
            <p className="muted">{daysUntil(classItem.startDate)} {language === 'en' ? 'at' : 'lúc'} {formatTime(classItem.startDate)}</p>
          </div>
          <div className="capacity-row">
            <span>{t('classFee')}</span>
            <strong>{price} VND</strong>
          </div>
          <div className="capacity-row">
            <span>{classItem.currentStudents}/{classItem.maxStudents} {t('enrolledCount')}</span>
            <strong>{percent}%</strong>
          </div>
          <div className="progress-track large">
            <div className={percent >= 100 ? 'progress-fill full' : 'progress-fill'} style={{ width: `${percent}%` }} />
          </div>

          {!user && (
            <div className="button-stack">
              <Link className="button button-primary button-full" to="/login">{t('loginToEnroll')}</Link>
              <Link className="button button-secondary button-full" to="/register">{t('createAccountAction')}</Link>
            </div>
          )}
          {user?.role !== 'admin' && !classItem.isEnrolled && (
            <div className="button-stack">
              <button className="button button-primary button-full" disabled={!user || isFull || payment.isPending} onClick={() => payment.mutate()}>
                <CreditCard size={18} /> {payment.isPending ? t('preparingPayment') : t('payWithStripe')}
              </button>
              <button className="button button-secondary button-full" disabled={!user || isFull || isEnrolling} onClick={handleEnroll}>
                {isFull ? t('classFull') : isEnrolling ? t('enrolling') : t('enrollWithoutPayment')}
              </button>
              {isFull && !data.userWaitlisted && (
                <button className="button button-dark button-full" disabled={!user || waitlist.isPending} onClick={() => waitlist.mutate()}>
                  {waitlist.isPending ? t('joiningWaitlist') : t('joinWaitlist')}
                </button>
              )}
              {data.userWaitlisted && (
                <div className="button-stack">
                  <button className="button button-dark button-full" disabled>
                    {t('onWaitlist')} ({classItem.waitlistCount})
                  </button>
                  <button className="button button-danger button-full" disabled={leaveWaitlist.isPending} onClick={() => {
                    if (confirm(t('confirmLeaveWaitlist'))) leaveWaitlist.mutate()
                  }}>
                    {leaveWaitlist.isPending ? t('leaving') : t('leaveWaitlist')}
                  </button>
                </div>
              )}
            </div>
          )}
          {user?.role !== 'admin' && (
            <button className="button button-secondary button-full" disabled={!user || bookmark.isPending} onClick={() => bookmark.mutate()}>
              <Heart size={18} /> {classItem.isBookmarked ? t('removeBookmark') : t('bookmarkClass')}
            </button>
          )}
          {user?.role !== 'admin' && classItem.isEnrolled && (
            <button className="button button-secondary button-full" disabled={isCancelling} onClick={handleCancel}>
              {isCancelling ? t('cancelling') : t('cancelEnrollment')}
            </button>
          )}
          {user?.role === 'admin' && (
            <div className="button-stack">
              <Link className="button button-dark button-full" to={`/admin/${classItem._id}/students`}>{t('viewStudents')}</Link>
              <Link className="button button-secondary button-full" to={`/admin/create?id=${classItem._id}`}>{t('editClass')}</Link>
              <button className="button button-danger button-full" disabled={remove.isPending} onClick={() => {
                if (confirm(t('deletePrompt'))) remove.mutate()
              }}>
                {remove.isPending ? t('deleting') : t('deleteClass')}
              </button>
            </div>
          )}
          {notice && <div className="alert alert-success">{notice}</div>}
          {actionError && <div className="alert alert-error">{getApiErrorMessage(actionError, t('operationFailed'))}</div>}
        </aside>

        <section className="page-card info-grid">
          <div>
            <UserRound size={20} />
            <span>{t('coach')}</span>
            <strong>
              {classItem.coach?._id
                ? <Link className="inline-link" to={`/coaches/${classItem.coach._id}`}>{classItem.coach.name || classItem.coachName}</Link>
                : (classItem.coach?.name || classItem.coachName)}
            </strong>
          </div>
          <div><CalendarDays size={20} /><span>{t('start')}</span><strong>{formatDateTime(classItem.startDate)}</strong></div>
          <div><Clock3 size={20} /><span>{t('schedule')}</span><strong>{classItem.schedule}</strong></div>
          <div><MapPin size={20} /><span>{t('location')}</span><strong>{classItem.location}</strong></div>
          <div><UsersRound size={20} /><span>{t('capacity')}</span><strong>{classItem.currentStudents}/{classItem.maxStudents}</strong></div>
          <div><Star size={20} /><span>{t('rating')}</span><strong>{classItem.averageRating ? `${classItem.averageRating}/5 (${classItem.reviewCount})` : t('noReviews')}</strong></div>
        </section>
      </div>

      <section className="page-card review-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('classFeedback')}</span>
          <h2>{t('reviews')}</h2>
        </div>
        {classItem.coach?.bio && (
          <div className="alert alert-success">
            <strong>{classItem.coach.name}</strong> - {classItem.coach.bio}
          </div>
        )}
        {user?.role !== 'admin' && classItem.isEnrolled && canReview && (
          <form className="review-form" onSubmit={(e) => { e.preventDefault(); review.mutate() }}>
            <label className="field">
              <span>{t('rating')}</span>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {t('stars')}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t('comment')}</span>
              <textarea rows="3" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder={t('shareExperience')} />
            </label>
            <button className="button button-primary button-fit" disabled={review.isPending} type="submit">{t('submitReview')}</button>
          </form>
        )}
        <div className="review-list">
          {(reviews.data || []).map((item) => (
            <article className="review-item" key={item._id}>
              <strong>{item.user?.name || t('student')} - {item.rating}/5</strong>
              <p>{item.comment || t('noComment')}</p>
            </article>
          ))}
          {!reviews.isLoading && (reviews.data || []).length === 0 && <p className="muted">{t('noReviews')}</p>}
        </div>
      </section>
    </div>
  )
}
