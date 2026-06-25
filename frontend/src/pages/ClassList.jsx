import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, MapPin, Search, Sparkles, UserRound } from 'lucide-react'
import api from '../api/axios'
import { capacityPercent, capacityText, classImage, daysUntil, formatDate, formatDateTime, formatTime, levelLabel } from '../utils/classUi'

function fetchClasses({ queryKey }) {
  const [_key, { page, search, level }] = queryKey
  return api.get('/classes', { params: { page, search, level } }).then((r) => r.data)
}

const levels = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

function getClassLoadError(error) {
  if (!error?.response) {
    return 'Cannot connect to backend. Start the backend and make sure MongoDB is connected.'
  }

  return error.response.data?.message || 'Could not load classes'
}

export default function ClassList() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['classes', { page, search, level }],
    queryFn: fetchClasses,
    placeholderData: (previousData) => previousData
  })

  const classes = data?.data || []
  const totalOpenSpots = classes.reduce((sum, item) => sum + Math.max(item.maxStudents - item.currentStudents, 0), 0)
  const nextClass = classes[0]

  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function updateLevel(value) {
    setLevel(value)
    setPage(1)
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <div className="eyebrow">Performance booking</div>
        <h1>Elevate your badminton skills</h1>
        <p>Find upcoming training sessions by level, coach, schedule, and available capacity.</p>

        <div className="search-panel">
          <Search size={20} />
          <input
            placeholder="Search classes, coaches, or descriptions..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills" aria-label="Filter by level">
          {levels.map((item) => (
            <button
              className={level === item.value ? 'pill active' : 'pill'}
              key={item.value}
              onClick={() => updateLevel(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="hero-stats" aria-label="Class highlights">
          <div>
            <span>Upcoming</span>
            <strong>{data?.pagination?.total ?? classes.length}</strong>
          </div>
          <div>
            <span>Open spots</span>
            <strong>{totalOpenSpots}</strong>
          </div>
          <div>
            <span>Next session</span>
            <strong>{nextClass ? formatDate(nextClass.startDate) : 'TBD'}</strong>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="card-grid">
          {[1, 2, 3].map((item) => <div className="class-card skeleton-card" key={item} />)}
        </div>
      )}

      {isError && <div className="alert alert-error">{getClassLoadError(error)}</div>}
      {!isLoading && classes.length === 0 && (
        <div className="empty-state empty-state-action">
          <Sparkles size={24} />
          <strong>No classes found</strong>
          <span>Try a different search or clear the level filter to see every upcoming session.</span>
          <button className="button button-secondary" type="button" onClick={() => { updateSearch(''); updateLevel('') }}>Reset filters</button>
        </div>
      )}

      <div className="card-grid">
        {classes.map((item) => {
          const percent = capacityPercent(item.currentStudents, item.maxStudents)
          return (
            <article className="class-card" key={item._id}>
              <div className="class-image">
                <img src={classImage(item.level)} alt={`${item.title} badminton class`} />
                <span className={`level-badge ${item.level}`}>{levelLabel(item.level)}</span>
              </div>
              <div className="class-body">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="meta-list">
                  <span><UserRound size={18} /> {item.coachName}</span>
                  <span><MapPin size={18} /> {item.location}</span>
                  <span><CalendarDays size={18} /> {formatDateTime(item.startDate)}</span>
                </div>
                <div className="class-quick-row">
                  <span>{daysUntil(item.startDate)}</span>
                  <span>{formatTime(item.startDate)}</span>
                  {item.isEnrolled && <span className="status-badge success">Booked</span>}
                </div>
                <div className="capacity-row">
                  <span>{item.currentStudents}/{item.maxStudents} spots filled</span>
                  <strong>{capacityText(item.currentStudents, item.maxStudents)}</strong>
                </div>
                <div className="progress-track">
                  <div className={percent >= 100 ? 'progress-fill full' : 'progress-fill'} style={{ width: `${percent}%` }} />
                </div>
                <Link className="button button-dark" to={`/classes/${item._id}`}>View Details</Link>
              </div>
            </article>
          )
        })}
      </div>

      {data?.pagination?.pages > 1 && (
        <div className="pagination">
          <button className="button button-secondary" disabled={page <= 1 || isFetching} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {data.pagination.page} of {data.pagination.pages}</span>
          <button className="button button-secondary" disabled={page >= data.pagination.pages || isFetching} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
