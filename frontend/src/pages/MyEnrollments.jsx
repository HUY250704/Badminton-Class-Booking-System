import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, CalendarDays, Heart, Hourglass, MapPin, Search, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, classImage, daysUntil, formatDateTime, levelLabel, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

export default function MyEnrollments() {
  const qc = useQueryClient()
  const { t, language } = useTranslation()
  const [transferDraft, setTransferDraft] = useState({ fromClass: '', toClass: '', reason: '' })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/classes/my/enrollments').then((r) => r.data)
  })

  const classesQuery = useQuery({
    queryKey: ['classes', { transferOptions: true }],
    queryFn: () => api.get('/classes', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: data.some((item) => item.class)
  })

  const transfers = useQuery({
    queryKey: ['my-transfers'],
    queryFn: () => api.get('/classes/my/transfers').then((r) => r.data)
  })

  const bookmarks = useQuery({
    queryKey: ['my-bookmarks'],
    queryFn: () => api.get('/classes/my/bookmarks').then((r) => r.data)
  })

  const waitlist = useQuery({
    queryKey: ['my-waitlist'],
    queryFn: () => api.get('/classes/my/waitlist').then((r) => r.data)
  })

  const createTransfer = useMutation({
    mutationFn: ({ fromClass, toClass, reason }) => api.post(`/classes/${fromClass}/transfers`, { toClass, reason }).then((r) => r.data),
    onSuccess: () => {
      setTransferDraft({ fromClass: '', toClass: '', reason: '' })
      qc.invalidateQueries({ queryKey: ['my-transfers'] })
    }
  })

  const transferStats = useMemo(() => {
    const items = transfers.data || []
    return {
      pending: items.filter((item) => item.status === 'pending').length,
      decided: items.filter((item) => item.status !== 'pending').length
    }
  }, [transfers.data])

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, language === 'en' ? 'Could not load enrollments' : 'Không thể tải lớp đã đăng ký')}</div>

  const activeEnrollments = data.filter((item) => item.class)
  const archivedCount = data.length - activeEnrollments.length
  const upcomingCount = activeEnrollments.filter((item) => new Date(item.class.startDate) >= new Date()).length
  const transferOptions = (classesQuery.data || []).map((klass) => localizedClass(klass, language)).filter((klass) => {
    if (!transferDraft.fromClass || klass._id === transferDraft.fromClass) return false
    return new Date(klass.startDate) >= new Date() && (klass.currentStudents ?? 0) < (klass.maxStudents ?? 1)
  })

  function submitTransfer(event) {
    event.preventDefault()
    if (!transferDraft.fromClass || !transferDraft.toClass) return
    createTransfer.mutate(transferDraft)
  }

  return (
    <div className="stack">
      <section className="section-heading">
        <span className="eyebrow">{t('studentDashboard')}</span>
        <div className="heading-row">
          <div>
            <h1>{t('myClasses')}</h1>
            <p>{t('trackBookedSessions')}</p>
          </div>
          <Link className="button button-primary" to="/classes"><Search size={18} /> {t('exploreClasses')}</Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><span>{t('bookedClasses')}</span><strong>{data.length}</strong></div>
        <div className="stat-card"><span>{t('upcoming')}</span><strong>{upcomingCount}</strong></div>
        <div className="stat-card"><span>{t('completed')}</span><strong>{Math.max(activeEnrollments.length - upcomingCount, 0)}</strong></div>
        <div className="stat-card"><span>{t('saved')}</span><strong>{bookmarks.data?.length ?? 0}</strong></div>
        <div className="stat-card"><span>{t('onWaitlist')}</span><strong>{waitlist.data?.length ?? 0}</strong></div>
        <div className="stat-card"><span>{t('transferRequests')}</span><strong>{transferStats.pending}/{transferStats.decided}</strong></div>
      </div>

      {archivedCount > 0 && (
        <div className="alert alert-error">
          {archivedCount} {t('archivedEnrollments')}
        </div>
      )}

      {data.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>{t('noEnrollmentsYet')}</strong>
          <span>{t('browseClassesHint')}</span>
          <Link className="button button-dark" to="/classes">{t('browseUpcomingClasses')}</Link>
        </div>
      )}

      <div className="card-grid">
        {activeEnrollments.map((item) => {
          const klass = localizedClass(item.class, language)
          return (
            <article className="class-card compact" key={item.id}>
              <div className="class-image">
                <img src={classImage(klass.level)} alt={`${klass.title} class`} />
                <span className={`level-badge ${klass.level}`}>{levelLabel(klass.level)}</span>
              </div>
              <div className="class-body">
                <h2>{klass.title}</h2>
                <div className="meta-list">
                  <span><UserRound size={18} /> {klass.coachName}</span>
                  <span><CalendarDays size={18} /> {klass.schedule}</span>
                  <span><MapPin size={18} /> {klass.location}</span>
                </div>
                <div className="class-quick-row">
                  <span>{daysUntil(klass.startDate)}</span>
                  <span className="status-badge success">{t('booked')}</span>
                </div>
                <div className="capacity-row">
                  <span>{klass.currentStudents}/{klass.maxStudents} {t('spotsFilled')}</span>
                  <strong>{t('booked')} {formatDateTime(item.enrolledAt)}</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${capacityPercent(klass.currentStudents, klass.maxStudents)}%` }} />
                </div>
                <Link className="button button-dark" to={`/classes/${klass._id}`}>{t('openClass')}</Link>
              </div>
            </article>
          )
        })}
      </div>

      <section className="admin-split">
        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('savedClasses')}</span>
            <h2><Heart size={20} /> {t('bookmarks')}</h2>
          </div>
          <div className="compact-list">
            {(bookmarks.data || []).slice(0, 5).map((item) => {
              const klass = localizedClass(item, language)
              return <article className="compact-row" key={klass._id}>
                <Heart size={18} />
                <div>
                  <strong>{klass.title}</strong>
                  <span>{klass.coachName} - {formatDateTime(klass.startDate)}</span>
                </div>
                <Link className="button button-secondary button-small" to={`/classes/${klass._id}`}>{t('open')}</Link>
              </article>
            })}
            {!bookmarks.isLoading && (bookmarks.data || []).length === 0 && <p className="muted">{t('noBookmarkedClasses')}</p>}
          </div>
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('waitingList')}</span>
            <h2><Hourglass size={20} /> {t('queuePosition')}</h2>
          </div>
          <div className="compact-list">
            {(waitlist.data || []).slice(0, 5).map((item) => (
              <article className="compact-row" key={item._id}>
                <Hourglass size={18} />
                <div>
                  <strong>{item.class ? localizedClass(item.class, language).title : t('classColumn')}</strong>
                  <span>{t('position')} #{item.position} - {item.class ? formatDateTime(item.class.startDate) : t('schedulePending')}</span>
                </div>
                {item.class && <Link className="button button-secondary button-small" to={`/classes/${item.class._id}`}>{t('open')}</Link>}
              </article>
            ))}
            {!waitlist.isLoading && (waitlist.data || []).length === 0 && <p className="muted">{t('noWaitlistEntries')}</p>}
          </div>
        </div>
      </section>

      {activeEnrollments.length > 0 && (
        <section className="page-card transfer-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('scheduleChanges')}</span>
            <h2>{t('requestTransfer')}</h2>
          </div>
          <form className="transfer-form" onSubmit={submitTransfer}>
            <label className="field">
              <span>{t('currentClass')}</span>
              <select value={transferDraft.fromClass} onChange={(e) => setTransferDraft((draft) => ({ ...draft, fromClass: e.target.value, toClass: '' }))}>
                <option value="">{t('chooseClass')}</option>
                {activeEnrollments.map((item) => (
                  <option key={item.class._id} value={item.class._id}>{localizedClass(item.class, language).title}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('moveTo')}</span>
              <select value={transferDraft.toClass} onChange={(e) => setTransferDraft((draft) => ({ ...draft, toClass: e.target.value }))}>
                <option value="">{t('chooseAvailableClass')}</option>
                {transferOptions.map((klass) => (
                  <option key={klass._id} value={klass._id}>{klass.title} - {formatDateTime(klass.startDate)}</option>
                ))}
              </select>
            </label>
            <label className="field transfer-reason">
              <span>{t('reason')}</span>
              <textarea rows="3" value={transferDraft.reason} onChange={(e) => setTransferDraft((draft) => ({ ...draft, reason: e.target.value }))} placeholder={t('transferReasonPlaceholder')} />
            </label>
            <button className="button button-primary" disabled={createTransfer.isPending || !transferDraft.fromClass || !transferDraft.toClass} type="submit">
              <ArrowRightLeft size={18} /> {createTransfer.isPending ? t('sending') : t('requestTransferButton')}
            </button>
          </form>
          {createTransfer.isError && <div className="alert alert-error">{getApiErrorMessage(createTransfer.error, language === 'en' ? 'Could not request transfer' : 'Không thể gửi yêu cầu chuyển lớp')}</div>}
          {createTransfer.isSuccess && <div className="alert alert-success">{t('transferSent')}</div>}
          <div className="transfer-list">
            {(transfers.data || []).map((item) => (
              <article className="transfer-item" key={item._id}>
                <strong>{item.fromClass ? localizedClass(item.fromClass, language).title : t('oldClass')} {t('toLower')} {item.toClass ? localizedClass(item.toClass, language).title : t('newClass')}</strong>
                <span className={item.status === 'approved' ? 'status-badge success' : 'status-badge'}>{item.status}</span>
              </article>
            ))}
            {!transfers.isLoading && (transfers.data || []).length === 0 && <p className="muted">{t('noTransferRequests')}</p>}
          </div>
        </section>
      )}
    </div>
  )
}
