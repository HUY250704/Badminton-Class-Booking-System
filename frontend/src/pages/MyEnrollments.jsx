import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, MapPin, Search, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, classImage, daysUntil, formatDateTime, levelLabel } from '../utils/classUi'

export default function MyEnrollments() {
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/classes/my/enrollments').then((r) => r.data)
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load enrollments')}</div>

  const upcomingCount = data.filter((item) => new Date(item.class.startDate) >= new Date()).length

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
        <div className="stat-card"><span>Completed</span><strong>{Math.max(data.length - upcomingCount, 0)}</strong></div>
      </div>

      {data.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>No enrollments yet</strong>
          <span>Choose a class that matches your level and reserve a spot in seconds.</span>
          <Link className="button button-dark" to="/classes">Browse upcoming classes</Link>
        </div>
      )}

      <div className="card-grid">
        {data.map((item) => {
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
    </div>
  )
}
