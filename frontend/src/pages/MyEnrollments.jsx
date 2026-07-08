import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, CalendarDays, Heart, Hourglass, MapPin, Search, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, classImage, daysUntil, formatDateTime, levelLabel } from '../utils/classUi'

export default function MyEnrollments() {
  const qc = useQueryClient()
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
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load enrollments')}</div>

  const activeEnrollments = data.filter((item) => item.class)
  const archivedCount = data.length - activeEnrollments.length
  const upcomingCount = activeEnrollments.filter((item) => new Date(item.class.startDate) >= new Date()).length
  const transferOptions = (classesQuery.data || []).filter((klass) => {
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
        <span className="eyebrow">Student dashboard</span>
        <div className="heading-row">
          <div>
            <h1>My Classes</h1>
            <p>Track the badminton sessions you have booked.</p>
          </div>
          <Link className="button button-primary" to="/classes"><Search size={18} /> Explore Classes</Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><span>Booked Classes</span><strong>{data.length}</strong></div>
        <div className="stat-card"><span>Upcoming</span><strong>{upcomingCount}</strong></div>
        <div className="stat-card"><span>Completed</span><strong>{Math.max(activeEnrollments.length - upcomingCount, 0)}</strong></div>
        <div className="stat-card"><span>Saved</span><strong>{bookmarks.data?.length ?? 0}</strong></div>
        <div className="stat-card"><span>Waitlist</span><strong>{waitlist.data?.length ?? 0}</strong></div>
        <div className="stat-card"><span>Transfer Requests</span><strong>{transferStats.pending}/{transferStats.decided}</strong></div>
      </div>

      {archivedCount > 0 && (
        <div className="alert alert-error">
          {archivedCount} enrollment{archivedCount === 1 ? '' : 's'} no longer have class details available.
        </div>
      )}

      {data.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>No enrollments yet</strong>
          <span>Choose a class that matches your level and reserve a spot in seconds.</span>
          <Link className="button button-dark" to="/classes">Browse upcoming classes</Link>
        </div>
      )}

      <div className="card-grid">
        {activeEnrollments.map((item) => {
          const klass = item.class
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
                  <span className="status-badge success">Booked</span>
                </div>
                <div className="capacity-row">
                  <span>{klass.currentStudents}/{klass.maxStudents} spots filled</span>
                  <strong>Booked {formatDateTime(item.enrolledAt)}</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${capacityPercent(klass.currentStudents, klass.maxStudents)}%` }} />
                </div>
                <Link className="button button-dark" to={`/classes/${klass._id}`}>Open Class</Link>
              </div>
            </article>
          )
        })}
      </div>

      <section className="admin-split">
        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">Saved classes</span>
            <h2><Heart size={20} /> Bookmarks</h2>
          </div>
          <div className="compact-list">
            {(bookmarks.data || []).slice(0, 5).map((klass) => (
              <article className="compact-row" key={klass._id}>
                <Heart size={18} />
                <div>
                  <strong>{klass.title}</strong>
                  <span>{klass.coachName} - {formatDateTime(klass.startDate)}</span>
                </div>
                <Link className="button button-secondary button-small" to={`/classes/${klass._id}`}>Open</Link>
              </article>
            ))}
            {!bookmarks.isLoading && (bookmarks.data || []).length === 0 && <p className="muted">No bookmarked classes yet.</p>}
          </div>
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">Waiting list</span>
            <h2><Hourglass size={20} /> Queue Position</h2>
          </div>
          <div className="compact-list">
            {(waitlist.data || []).slice(0, 5).map((item) => (
              <article className="compact-row" key={item._id}>
                <Hourglass size={18} />
                <div>
                  <strong>{item.class?.title || 'Class'}</strong>
                  <span>Position #{item.position} - {item.class ? formatDateTime(item.class.startDate) : 'Schedule pending'}</span>
                </div>
                {item.class && <Link className="button button-secondary button-small" to={`/classes/${item.class._id}`}>Open</Link>}
              </article>
            ))}
            {!waitlist.isLoading && (waitlist.data || []).length === 0 && <p className="muted">No waitlist entries yet.</p>}
          </div>
        </div>
      </section>

      {activeEnrollments.length > 0 && (
        <section className="page-card transfer-panel">
          <div className="panel-header">
            <span className="eyebrow">Schedule changes</span>
            <h2>Request a Class Transfer</h2>
          </div>
          <form className="transfer-form" onSubmit={submitTransfer}>
            <label className="field">
              <span>Current class</span>
              <select value={transferDraft.fromClass} onChange={(e) => setTransferDraft((draft) => ({ ...draft, fromClass: e.target.value, toClass: '' }))}>
                <option value="">Choose class</option>
                {activeEnrollments.map((item) => (
                  <option key={item.class._id} value={item.class._id}>{item.class.title}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Move to</span>
              <select value={transferDraft.toClass} onChange={(e) => setTransferDraft((draft) => ({ ...draft, toClass: e.target.value }))}>
                <option value="">Choose available class</option>
                {transferOptions.map((klass) => (
                  <option key={klass._id} value={klass._id}>{klass.title} - {formatDateTime(klass.startDate)}</option>
                ))}
              </select>
            </label>
            <label className="field transfer-reason">
              <span>Reason</span>
              <textarea rows="3" value={transferDraft.reason} onChange={(e) => setTransferDraft((draft) => ({ ...draft, reason: e.target.value }))} placeholder="Why do you need to move?" />
            </label>
            <button className="button button-primary" disabled={createTransfer.isPending || !transferDraft.fromClass || !transferDraft.toClass} type="submit">
              <ArrowRightLeft size={18} /> {createTransfer.isPending ? 'Sending...' : 'Request Transfer'}
            </button>
          </form>
          {createTransfer.isError && <div className="alert alert-error">{getApiErrorMessage(createTransfer.error, 'Could not request transfer')}</div>}
          {createTransfer.isSuccess && <div className="alert alert-success">Transfer request sent for admin review.</div>}
          <div className="transfer-list">
            {(transfers.data || []).map((item) => (
              <article className="transfer-item" key={item._id}>
                <strong>{item.fromClass?.title || 'Old class'} to {item.toClass?.title || 'New class'}</strong>
                <span className={item.status === 'approved' ? 'status-badge success' : 'status-badge'}>{item.status}</span>
              </article>
            ))}
            {!transfers.isLoading && (transfers.data || []).length === 0 && <p className="muted">No transfer requests yet.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
