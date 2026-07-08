import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CreditCard, MapPin, Search, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, capacityText, classImage, daysUntil, formatDate, formatDateTime, formatTime, levelLabel } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

function fetchClasses({ queryKey }) {
  const [_key, filters] = queryKey
  return api.get('/classes', {
    params: {
      ...filters,
      limit: 9
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
  const [filters, setFilters] = useState({
    level: '',
    minPrice: '',
    maxPrice: '',
    startDateFrom: '',
    startDateTo: '',
    coach: '',
    location: '',
    sortBy: 'startDate',
    sortOrder: 'asc'
  })
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(searchInput)
  const { language, t } = useTranslation()

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['classes', {
      search,
      page,
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    }],
    queryFn: fetchClasses,
    placeholderData: (previousData) => previousData
  })

  const classes = data?.data || []
  const totalOpenSpots = classes.reduce((sum, item) => sum + Math.max(item.maxStudents - item.currentStudents, 0), 0)
  const nextClass = classes[0]

  function updateSearch(value) {
    setSearchInput(value)
    setPage(1)
  }

  function resetSearch() {
    setSearchInput('')
    setFilters({
      level: '',
      minPrice: '',
      maxPrice: '',
      startDateFrom: '',
      startDateTo: '',
      coach: '',
      location: '',
      sortBy: 'startDate',
      sortOrder: 'asc'
    })
    setPage(1)
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  const pagination = data?.pagination || { page: 1, pages: 1, total: classes.length }
  const pages = Array.from({ length: Math.min(pagination.pages || 1, 7) }, (_, index) => {
    const totalPages = pagination.pages || 1
    if (totalPages <= 7) return index + 1
    const start = Math.min(Math.max(page - 3, 1), totalPages - 6)
    return start + index
  })

  return (
    <div className="stack">
      <section className="hero-panel">
        <div className="eyebrow">Performance booking</div>
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroDescription')}</p>

        <div className="search-panel compact">
          <Search size={20} />
          <input
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(e) => updateSearch(e.target.value)}
          />
          {searchInput && (
            <button className="button button-secondary button-small" type="button" onClick={resetSearch}>{t('resetFilters')}</button>
          )}
        </div>

        <div className="advanced-filters">
          <div className="filter-title"><SlidersHorizontal size={16} /> {t('advancedFilters', language === 'en' ? 'Advanced filters' : 'Bộ lọc nâng cao')}</div>
          <div className="filter-grid">
            <div className="filter-field">
              <label>{t('level', 'Level')}</label>
              <select value={filters.level} onChange={(e) => updateFilter('level', e.target.value)}>
                <option value="">{t('allLevels', language === 'en' ? 'All levels' : 'Tất cả cấp độ')}</option>
                <option value="beginner">{levelLabel('beginner')}</option>
                <option value="intermediate">{levelLabel('intermediate')}</option>
                <option value="advanced">{levelLabel('advanced')}</option>
              </select>
            </div>
            <div className="filter-field">
              <label>{t('minPrice', language === 'en' ? 'Min price' : 'Giá từ')}</label>
              <input min="0" step="1000" type="number" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>{t('maxPrice', language === 'en' ? 'Max price' : 'Giá đến')}</label>
              <input min="0" step="1000" type="number" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>{t('coach', 'Coach')}</label>
              <input value={filters.coach} onChange={(e) => updateFilter('coach', e.target.value)} placeholder={language === 'en' ? 'Coach name' : 'Tên coach'} />
            </div>
            <div className="filter-field">
              <label>{t('location', 'Location')}</label>
              <input value={filters.location} onChange={(e) => updateFilter('location', e.target.value)} placeholder={language === 'en' ? 'Court or branch' : 'Sân hoặc cơ sở'} />
            </div>
            <div className="filter-field">
              <label>{t('fromDate', language === 'en' ? 'From date' : 'Từ ngày')}</label>
              <input type="date" value={filters.startDateFrom} onChange={(e) => updateFilter('startDateFrom', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>{t('toDate', language === 'en' ? 'To date' : 'Đến ngày')}</label>
              <input type="date" value={filters.startDateTo} onChange={(e) => updateFilter('startDateTo', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>{t('sort', language === 'en' ? 'Sort' : 'Sắp xếp')}</label>
              <select value={`${filters.sortBy}:${filters.sortOrder}`} onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(':')
                setFilters((current) => ({ ...current, sortBy, sortOrder }))
                setPage(1)
              }}>
                <option value="startDate:asc">{language === 'en' ? 'Start date earliest' : 'Ngày học gần nhất'}</option>
                <option value="startDate:desc">{language === 'en' ? 'Start date latest' : 'Ngày học xa nhất'}</option>
                <option value="price:asc">{language === 'en' ? 'Price low to high' : 'Giá tăng dần'}</option>
                <option value="price:desc">{language === 'en' ? 'Price high to low' : 'Giá giảm dần'}</option>
                <option value="popularity:desc">{language === 'en' ? 'Most popular' : 'Phổ biến nhất'}</option>
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button className="button button-secondary button-small" type="button" onClick={resetSearch}>{t('resetFilters')}</button>
            {isFetching && <span className="status-badge">{language === 'en' ? 'Updating...' : 'Đang cập nhật...'}</span>}
          </div>
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

      {pagination.pages > 1 && (
        <nav className="pagination" aria-label="Class pages">
          <button className="button button-secondary button-small" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} type="button">
            {language === 'en' ? 'Previous' : 'Trước'}
          </button>
          {pages.map((pageNumber) => (
            <button className={pageNumber === page ? 'pill active' : 'pill'} key={pageNumber} onClick={() => setPage(pageNumber)} type="button">
              {pageNumber}
            </button>
          ))}
          <button className="button button-secondary button-small" disabled={page >= pagination.pages} onClick={() => setPage((current) => Math.min(current + 1, pagination.pages))} type="button">
            {language === 'en' ? 'Next' : 'Sau'}
          </button>
        </nav>
      )}

    </div>
  )
}
