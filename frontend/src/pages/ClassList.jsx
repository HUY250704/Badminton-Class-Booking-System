import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CreditCard, MapPin, Search, Sparkles, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, capacityText, classImage, daysUntil, formatDate, formatDateTime, formatTime, levelLabel, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

function fetchClasses({ queryKey }) {
  const [_key, filters] = queryKey
  return api.get('/classes', {
    params: {
      ...filters,
      limit: 1000
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
  const search = useDebouncedValue(searchInput)
  const coachLocation = useDebouncedValue(coachLocationInput)
  const { language, t } = useTranslation()

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['classes', {
      search,
      coachLocation,
      includePast: true,
      sortBy: 'startDate',
      sortOrder: 'asc'
    }],
    queryFn: fetchClasses,
    placeholderData: (previousData) => previousData
  })

  const classes = (data?.data || []).map((item) => localizedClass(item, language))
  const totalOpenSpots = classes.reduce((sum, item) => sum + Math.max(item.maxStudents - item.currentStudents, 0), 0)
  const nextClass = classes[0]
  const hasActiveSearch = Boolean(searchInput || coachLocationInput)

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

        <div className="hero-stats" aria-label="Class highlights">
          <div>
            <span>{t('upcoming')}</span>
            <strong>{data?.pagination?.total ?? classes.length}</strong>
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
    </div>
  )
}
