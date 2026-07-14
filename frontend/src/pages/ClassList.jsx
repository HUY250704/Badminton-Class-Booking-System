import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, MapPin, Search, Sparkles, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, capacityText, classImage, daysUntil, formatDate, formatDateTime, formatTime, levelLabel, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

const PAGE_SIZE = 9

function fetchClasses({ queryKey }) {
  const [_key, filters] = queryKey
  return api.get('/classes', {
    params: {
      ...filters,
      limit: PAGE_SIZE
    }
  }).then((r) => r.data)
}

function getClassLoadError(error) {
  return getApiErrorMessage(error, 'Could not load classes')
}

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

export default function ClassList() {
  const [searchInput, setSearchInput] = useState('')
  const [coachLocationInput, setCoachLocationInput] = useState('')
  const [viewMode, setViewMode] = useState('upcoming')
  const [page, setPage] = useState(1)
  const [nowIso] = useState(() => new Date().toISOString())
  const search = useDebouncedValue(searchInput)
  const coachLocation = useDebouncedValue(coachLocationInput)
  const { language, t } = useTranslation()
  const classQuery = {
    search,
    coachLocation,
    page,
    sortBy: 'startDate',
    sortOrder: viewMode === 'past' ? 'desc' : 'asc'
  }

  if (viewMode !== 'upcoming') {
    classQuery.includePast = true
  }

  if (viewMode === 'past') {
    classQuery.startDateTo = nowIso
  }

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['classes', classQuery],
    queryFn: fetchClasses,
    placeholderData: (previousData) => previousData
  })

  const classes = (data?.data || []).map((item) => localizedClass(item, language))
  const pagination = data?.pagination || { page, limit: PAGE_SIZE, total: classes.length, pages: 1 }
  const totalPages = Math.max(pagination.pages || 1, 1)
  const totalOpenSpots = classes.reduce((sum, item) => sum + Math.max(item.maxStudents - item.currentStudents, 0), 0)
  const nextClass = classes[0]
  const hasActiveSearch = Boolean(searchInput || coachLocationInput)

  useEffect(() => {
    setPage(1)
  }, [search, coachLocation, viewMode])

  function resetSearch() {
    setSearchInput('')
    setCoachLocationInput('')
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <div className="eyebrow">{t('heroBadge')}</div>
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroDescription')}</p>

        <div className="class-search-row">
          <div className="search-panel compact">
            <Search size={20} />
            <input
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="search-panel compact">
            <MapPin size={20} />
            <input
              placeholder={t('searchCoachLocation')}
              value={coachLocationInput}
              onChange={(e) => setCoachLocationInput(e.target.value)}
            />
          </div>
          {hasActiveSearch && (
            <button className="button button-secondary button-small" type="button" onClick={resetSearch}>{t('resetFilters')}</button>
          )}
          {isFetching && <span className="status-badge">{t('updating')}</span>}
        </div>

        <div className="filter-pills" aria-label={t('classDateFilter', 'Class date filter')}>
          {['upcoming', 'all', 'past'].map((mode) => (
            <button
              className={viewMode === mode ? 'active' : ''}
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
            >
              {t(
                mode === 'all' ? 'allClasses' : mode === 'past' ? 'pastClasses' : 'upcomingClasses',
                mode === 'all' ? 'All classes' : mode === 'past' ? 'Past classes' : 'Upcoming classes'
              )}
            </button>
          ))}
        </div>

        <div className="hero-stats" aria-label="Class highlights">
          <div>
            <span>{viewMode === 'past' ? t('pastClasses', 'Past classes') : viewMode === 'all' ? t('allClasses', 'All classes') : t('upcoming')}</span>
            <strong>{pagination.total ?? classes.length}</strong>
          </div>
          <div>
            <span>{t('openSpots')}</span>
            <strong>{totalOpenSpots}</strong>
          </div>
          <div>
            <span>{t('nextSession')}</span>
            <strong>{nextClass ? formatDate(nextClass.startDate) : t('tbd')}</strong>
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
          <strong>{t('noClasses')}</strong>
          <span>{t('noClassesHint')}</span>
          <button className="button button-secondary" type="button" onClick={resetSearch}>{t('resetFilters')}</button>
        </div>
      )}

      <div className="card-grid">
        {classes.map((item) => {
          const percent = capacityPercent(item.currentStudents, item.maxStudents)
          return (
            <article className="class-card" key={item._id}>
              <div className="class-image">
                <img src={item.imageUrl || classImage(item.level)} alt={`${item.title} badminton class`} />
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
                  <span><CreditCard size={16} /> {Number(item.price ?? 500000).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} VND</span>
                </div>
                <div className="class-quick-row">
                  <span>{daysUntil(item.startDate)}</span>
                  <span>{formatTime(item.startDate)}</span>
                  {item.isEnrolled && <span className="status-badge success">{t('booked')}</span>}
                </div>
                <div className="capacity-row">
                  <span>{item.currentStudents}/{item.maxStudents} {t('spotsFilled')}</span>
                  <strong>{capacityText(item.currentStudents, item.maxStudents)}</strong>
                </div>
                <div className="progress-track">
                  <div className={percent >= 100 ? 'progress-fill full' : 'progress-fill'} style={{ width: `${percent}%` }} />
                </div>
                <Link className="button button-dark" to={`/classes/${item._id}`}>{t('viewDetails')}</Link>
              </div>
            </article>
          )
        })}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="pagination" aria-label={t('pagination', 'Pagination')}>
          <button
            className="button button-secondary button-small"
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            title={t('previousPage', 'Previous page')}
            aria-label={t('previousPage', 'Previous page')}
          >
            <ChevronLeft size={18} />
          </button>
          <span>{t('page', 'Page')} {pagination.page} / {totalPages}</span>
          <button
            className="button button-secondary button-small"
            type="button"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            title={t('nextPage', 'Next page')}
            aria-label={t('nextPage', 'Next page')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
