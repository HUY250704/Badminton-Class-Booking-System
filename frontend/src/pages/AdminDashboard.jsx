import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3, CalendarDays, CheckCircle2, Download, Edit, Eye, Plus, Search, ShieldCheck, Trash2, UserRound, UsersRound, XCircle } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, formatDateTime, levelLabel, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

function dateInputValue(date) {
  return date.toISOString().slice(0, 10)
}

function defaultReportRange() {
  const now = new Date()
  return {
    startDate: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  }
}

function csvValue(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadClassReportCsv(report) {
  const rows = [
    ['Class', 'Coach', 'Level', 'Start Date', 'Active Enrollments', 'Capacity', 'Fill Rate', 'Revenue', 'Paid Transactions', 'Present Rate'],
    ...(report?.classBreakdown || []).map((item) => [
      item.title,
      item.coachName,
      levelLabel(item.level),
      formatDateTime(item.startDate),
      item.activeEnrollments,
      item.maxStudents,
      item.fillRate == null ? 'N/A' : `${item.fillRate}%`,
      item.revenue,
      item.paidTransactions,
      item.presentRate == null ? 'N/A' : `${item.presentRate}%`
    ])
  ]
  const blob = new Blob([rows.map((row) => row.map(csvValue).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `admin-report-${report?.range?.startDate?.slice(0, 10) || 'start'}-${report?.range?.endDate?.slice(0, 10) || 'end'}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function formatCurrency(value, language) {
  return Number(value || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')
}

function formatMonthLabel(value) {
  if (!value) return ''
  const [year, month] = String(value).split('-')
  return month && year ? `${month}/${year.slice(2)}` : value
}

function MonthlyRevenueTooltip({ active, payload, label, language }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{formatMonthLabel(label)}</strong>
      <span>{formatCurrency(payload[0].value, language)} VND</span>
    </div>
  )
}

function MonthlyRevenueChart({ data, isLoading, language, t }) {
  return (
    <div className="monthly-revenue-chart" aria-label={t('monthlyRevenue')}>
      {data.length > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--outline)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 800 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 800 }} tickFormatter={(value) => formatCurrency(value, language)} width={74} />
            <Tooltip cursor={{ fill: 'rgba(163, 230, 53, 0.12)' }} content={(props) => <MonthlyRevenueTooltip {...props} language={language} />} />
            <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} maxBarSize={54} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {!isLoading && data.length === 0 && <p className="muted">{t('noPaidRevenueSixMonths')}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const qc = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [level, setLevel] = useState('')
  const [reportRange, setReportRange] = useState(defaultReportRange)
  const [isMonthlyRevenueExpanded, setMonthlyRevenueExpanded] = useState(false)
  const { language, t } = useTranslation()
  const search = useDebouncedValue(searchInput)
  const levels = [
    { value: '', label: t('all') },
    { value: 'beginner', label: levelLabel('beginner') },
    { value: 'intermediate', label: levelLabel('intermediate') },
    { value: 'advanced', label: levelLabel('advanced') }
  ]

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['classes', { page: 1, search, level, admin: true, includePast: true }],
    queryFn: () => api.get('/classes', { params: { page: 1, limit: 50, search, level, includePast: true } }).then((r) => r.data)
  })

  const metrics = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.get('/admin/metrics').then((r) => r.data)
  })

  const transfers = useQuery({
    queryKey: ['admin', 'transfers'],
    queryFn: () => api.get('/admin/transfers').then((r) => r.data)
  })

  const auditLogs = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then((r) => r.data)
  })

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data)
  })

  const coaches = useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get('/coaches').then((r) => r.data)
  })

  const reports = useQuery({
    queryKey: ['admin', 'reports', reportRange],
    queryFn: () => api.get('/admin/reports', { params: reportRange }).then((r) => r.data)
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/classes/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'], exact: false, refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
  })

  const decideTransfer = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/transfers/${id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'transfers'] })
      qc.invalidateQueries({ queryKey: ['classes'], exact: false, refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] })
    }
  })

  const updateRole = useMutation({
    mutationFn: ({ userId, role }) => api.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    }
  })

  const classes = (data?.data || []).map((item) => localizedClass(item, language))
  const totalEnrollment = classes.reduce((sum, item) => sum + item.currentStudents, 0)
  const totalCapacity = classes.reduce((sum, item) => sum + item.maxStudents, 0)
  const totalCapacityPercent = totalCapacity > 0 ? `${capacityPercent(totalEnrollment, totalCapacity)}%` : 'N/A'
  const upcomingCount = classes.filter((item) => new Date(item.startDate) >= new Date()).length
  const pastCount = Math.max(classes.length - upcomingCount, 0)
  const reportSummary = reports.data?.summary || {}
  const maxDailyRevenue = Math.max(...(reports.data?.revenueByDay || []).map((item) => item.revenue), 0)
  const monthlyRevenue = metrics.data?.monthlyRevenue || []
  const monthlyRevenueChart = monthlyRevenue.map((item) => ({
    ...item,
    label: formatMonthLabel(item.month)
  }))
  const upcomingClasses = metrics.data?.upcomingClasses || []

  return (
    <div className="admin-layout">
      <section className="section-heading">
        <span className="eyebrow">{t('adminPortal')}</span>
        <div className="heading-row">
          <div>
            <h1>{t('classManagement')}</h1>
            <p>{t('classManagementDescription')}</p>
          </div>
          <Link className="button button-primary" to="/admin/create"><Plus size={18} /> {t('createNewClass')}</Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><span>{t('totalClasses')}</span><strong>{classes.length}</strong></div>
        <div className="stat-card"><span>{t('upcomingPast')}</span><strong>{upcomingCount}/{pastCount}</strong></div>
        <div className="stat-card"><span>{t('totalEnrollment')}</span><strong>{totalEnrollment}/{totalCapacity || 0}</strong></div>
        <div className="stat-card"><span>{t('capacityFilled')}</span><strong>{totalCapacityPercent}</strong></div>
        <div className="stat-card"><span>{t('monthRevenue')}</span><strong>{Number(metrics.data?.monthRevenue || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</strong></div>
        <div className="stat-card"><span>{t('paidTransactions')}</span><strong>{metrics.data?.paidTransactions ?? 0}</strong></div>
        <div className="stat-card"><span>{t('newStudents')}</span><strong>{metrics.data?.newStudents ?? 0}</strong></div>
        <div className="stat-card"><span>{t('overallFill')}</span><strong>{metrics.data?.fillRate == null ? t('notAvailable') : `${metrics.data.fillRate}%`}</strong></div>
      </div>

      <section className="admin-split">
        <div className="report-chart">
          <div className="panel-header compact">
            <BarChart3 size={18} />
            <h2>{t('monthlyRevenue')}</h2>
          </div>
          <div
            className="chart-expand-trigger"
            role="button"
            tabIndex={0}
            title={t('expandChart', 'Expand chart')}
            onClick={() => setMonthlyRevenueExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setMonthlyRevenueExpanded(true)
              }
            }}
          >
            <MonthlyRevenueChart data={monthlyRevenueChart} isLoading={metrics.isLoading} language={language} t={t} />
          </div>
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('openingSoon')}</span>
            <h2>{t('upcomingClasses')}</h2>
          </div>
          <div className="compact-list">
            {upcomingClasses.map((item) => (
              <article className="compact-row" key={item._id}>
                <CalendarDays size={18} />
                <div>
                  <strong>{localizedClass(item, language).title}</strong>
                  <span>{item.coachName} - {formatDateTime(item.startDate)}</span>
                  <span>{item.location}</span>
                </div>
                <Link className="button button-secondary button-small" to={`/classes/${item._id}`}>{t('open')}</Link>
              </article>
            ))}
            {!metrics.isLoading && upcomingClasses.length === 0 && <p className="muted">{t('noUpcomingClasses')}</p>}
          </div>
        </div>
      </section>

      {isMonthlyRevenueExpanded && (
        <div className="chart-modal-backdrop" role="presentation" onClick={() => setMonthlyRevenueExpanded(false)}>
          <section className="chart-modal page-card" role="dialog" aria-modal="true" aria-label={t('monthlyRevenue')} onClick={(event) => event.stopPropagation()}>
            <div className="chart-modal-header">
              <div className="panel-header compact">
                <BarChart3 size={20} />
                <h2>{t('monthlyRevenue')}</h2>
              </div>
              <button className="icon-button" type="button" title={t('close', 'Close')} aria-label={t('close', 'Close')} onClick={() => setMonthlyRevenueExpanded(false)}>
                <XCircle size={18} />
              </button>
            </div>
            <MonthlyRevenueChart data={monthlyRevenueChart} isLoading={metrics.isLoading} language={language} t={t} />
          </section>
        </div>
      )}

      <section className="report-panel">
        <div className="panel-header report-header">
          <div>
            <span className="eyebrow">{t('reports')}</span>
            <h2>{t('performanceReport')}</h2>
          </div>
          <div className="report-filters">
            <label className="field">
              {t('from')}
              <input
                type="date"
                value={reportRange.startDate}
                onChange={(e) => setReportRange((current) => ({ ...current, startDate: e.target.value }))}
              />
            </label>
            <label className="field">
              {t('to')}
              <input
                type="date"
                value={reportRange.endDate}
                onChange={(e) => setReportRange((current) => ({ ...current, endDate: e.target.value }))}
              />
            </label>
            <button
              className="button button-secondary"
              type="button"
              disabled={!reports.data?.classBreakdown?.length}
              onClick={() => downloadClassReportCsv(reports.data)}
            >
              <Download size={18} /> CSV
            </button>
          </div>
        </div>

        {reports.isError && <div className="alert alert-error">{getApiErrorMessage(reports.error, t('couldNotLoadReports'))}</div>}

        <div className="stats-grid report-stats">
          <div className="report-metric"><span>{t('revenue')}</span><strong>{Number(reportSummary.revenueTotal || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</strong></div>
          <div className="report-metric"><span>{t('paid')}</span><strong>{reportSummary.paidTransactions ?? 0}</strong></div>
          <div className="report-metric"><span>{t('newEnrollments')}</span><strong>{reportSummary.newEnrollments ?? 0}</strong></div>
          <div className="report-metric"><span>{t('cancelled')}</span><strong>{reportSummary.cancelledEnrollments ?? 0}</strong></div>
          <div className="report-metric"><span>{t('activeStudents')}</span><strong>{reportSummary.activeStudents ?? 0}</strong></div>
          <div className="report-metric"><span>{t('classesStarted')}</span><strong>{reportSummary.classesStarted ?? 0}</strong></div>
          <div className="report-metric"><span>{t('attendance')}</span><strong>{reportSummary.attendanceMarked ?? 0}</strong></div>
          <div className="report-metric"><span>{t('presentRate')}</span><strong>{reportSummary.presentRate == null ? t('notAvailable') : `${reportSummary.presentRate}%`}</strong></div>
        </div>

        <div className="report-split">
          <div className="report-chart">
            <div className="panel-header compact">
              <BarChart3 size={18} />
              <h3>{t('dailyRevenue')}</h3>
            </div>
            <div className="chart-bars">
              {(reports.data?.revenueByDay || []).slice(0, 14).map((item) => (
                <div className="chart-row" key={item.date}>
                  <span>{item.date.slice(5)}</span>
                  <div><strong style={{ width: `${maxDailyRevenue > 0 ? Math.max((item.revenue / maxDailyRevenue) * 100, 4) : 0}%` }} /></div>
                  <em>{Number(item.revenue).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</em>
                </div>
              ))}
              {!reports.isLoading && (reports.data?.revenueByDay || []).length === 0 && <p className="muted">{t('noPaidRevenue')}</p>}
            </div>
          </div>

          <div className="table-card report-table">
            <table>
              <thead>
                <tr>
                  <th>{t('classColumn')}</th>
                  <th>{t('fill')}</th>
                  <th>{t('revenue')}</th>
                  <th>{t('attendance')}</th>
                </tr>
              </thead>
              <tbody>
                {(reports.data?.classBreakdown || []).slice(0, 8).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{localizedClass(item, language).title}</strong>
                      <span>{formatDateTime(item.startDate)}</span>
                    </td>
                    <td><strong>{item.activeEnrollments}/{item.maxStudents}</strong><span>{item.fillRate == null ? t('notAvailable') : `${item.fillRate}%`}</span></td>
                    <td><strong>{Number(item.revenue || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</strong><span>{item.paidTransactions} {t('paid').toLowerCase()}</span></td>
                    <td><strong>{item.presentRate == null ? t('notAvailable') : `${item.presentRate}%`}</strong><span>{t('presentRate')}</span></td>
                  </tr>
                ))}
                {!reports.isLoading && (reports.data?.classBreakdown || []).length === 0 && (
                  <tr>
                    <td colSpan="4"><span>{t('noClassesStarted')}</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="admin-controls">
        <label className="admin-search">
          <Search size={18} />
          <input
            placeholder={t('searchByClass')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <div className="filter-pills" aria-label="Filter admin classes by level">
          {levels.map((item) => (
            <button
              className={level === item.value ? 'pill active' : 'pill'}
              key={item.value}
              onClick={() => setLevel(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && <div className="page-card skeleton-card tall" />}
      {isError && <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load classes')}</div>}
      {!isLoading && classes.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>{t('noClassesAdmin')}</strong>
          <span>{t('adminEmptyHint')}</span>
          <div className="empty-actions">
            <button className="button button-secondary" type="button" onClick={() => { setSearchInput(''); setLevel('') }}>{t('resetFilters')}</button>
            <Link className="button button-dark" to="/admin/create"><Plus size={18} /> {t('createClass')}</Link>
          </div>
        </div>
      )}

      {classes.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t('classTitle')}</th>
                <th>{t('level')}</th>
                <th>{t('start')}</th>
                <th>{t('slots')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => {
                const isPast = new Date(item.startDate) < new Date()
                return (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.title}</strong>
                      <span>{item.coachName} | {item.location}</span>
                    </td>
                    <td><span className={`level-badge inline ${item.level}`}>{levelLabel(item.level)}</span></td>
                    <td>
                      <strong>{formatDateTime(item.startDate)}</strong>
                      <span>{item.schedule}</span>
                    </td>
                    <td>
                      <div className="mini-capacity">
                        <span>{item.currentStudents}/{item.maxStudents}</span>
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${capacityPercent(item.currentStudents, item.maxStudents)}%` }} /></div>
                      </div>
                    </td>
                    <td><span className={isPast ? 'status-badge muted' : 'status-badge success'}>{isPast ? t('past') : t('upcomingStatus')}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link title={t('details')} aria-label={`${t('details')} ${item.title}`} to={`/classes/${item._id}`}><Eye size={18} /></Link>
                        <Link title={t('students')} aria-label={`${t('students')} ${item.title}`} to={`/admin/${item._id}/students`}><UsersRound size={18} /></Link>
                        <Link title={t('editClass')} aria-label={`${t('editClass')} ${item.title}`} to={`/admin/create?id=${item._id}`}><Edit size={18} /></Link>
                        <button title={t('deleteClass')} aria-label={`${t('deleteClass')} ${item.title}`} disabled={remove.isPending} onClick={() => {
                          if (confirm(t('deleteConfirmation'))) remove.mutate(item._id)
                        }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {remove.isError && <div className="alert alert-error">{getApiErrorMessage(remove.error, t('couldNotDeleteClass'))}</div>}

      <section className="page-card admin-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('coachManagement')}</span>
          <h2>{t('coachDirectory')}</h2>
        </div>
        <div className="compact-list">
          {(coaches.data || []).slice(0, 6).map((coach) => (
            <article className="compact-row" key={coach._id}>
              <div className="compact-avatar">
                {coach.photoUrl ? <img src={coach.photoUrl} alt="" /> : <UserRound size={20} />}
              </div>
              <div>
                <strong>{coach.name}</strong>
                <span>{coach.bio || t('noBioYet')}</span>
                <span>{(coach.specialties || []).join(', ') || t('noSpecialtiesListed')}</span>
                <span>{coach.teachingSchedule?.[0] ? `${t('nextSession')}: ${localizedClass(coach.teachingSchedule[0], language).title} - ${formatDateTime(coach.teachingSchedule[0].startDate)}` : t('noUpcomingTeachingSchedule')}</span>
              </div>
              <Link className="button button-secondary button-small" to="/admin/create">{t('assign')}</Link>
            </article>
          ))}
          {!coaches.isLoading && (coaches.data || []).length === 0 && <p className="muted">{t('noCoachProfiles')}</p>}
        </div>
      </section>

      <section className="page-card admin-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('userAccess')}</span>
          <h2>{t('roles')}</h2>
        </div>
        <div className="compact-list">
          {(users.data || []).slice(0, 10).map((user) => (
            <article className="compact-row" key={user._id}>
              <div className="compact-avatar">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <label className="role-select" aria-label={`Role for ${user.name}`}>
                <select
                  value={user.role}
                  disabled={updateRole.isPending}
                  onChange={(event) => updateRole.mutate({ userId: user._id, role: event.target.value })}
                >
                  <option value="user">{t('user')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </label>
            </article>
          ))}
          {!users.isLoading && (users.data || []).length === 0 && <p className="muted">{t('noUsersFound')}</p>}
        </div>
        {updateRole.isError && <div className="alert alert-error">{getApiErrorMessage(updateRole.error, t('couldNotUpdateUserRole'))}</div>}
      </section>

      <section className="admin-split">
        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('scheduleRequests')}</span>
            <h2>{t('transferQueue')}</h2>
          </div>
          <div className="compact-list">
            {(transfers.data || []).slice(0, 6).map((item) => (
              <article className="compact-row" key={item._id}>
                <div>
                  <strong>{item.user?.name || t('student')}</strong>
                  <span>{item.fromClass ? localizedClass(item.fromClass, language).title : t('oldClass')} {t('toLower')} {item.toClass ? localizedClass(item.toClass, language).title : t('newClass')}</span>
                </div>
                {item.status === 'pending' ? (
                  <div className="table-actions">
                    <button title={t('approve')} disabled={decideTransfer.isPending} onClick={() => decideTransfer.mutate({ id: item._id, status: 'approved' })}><CheckCircle2 size={18} /></button>
                    <button title={t('reject')} disabled={decideTransfer.isPending} onClick={() => decideTransfer.mutate({ id: item._id, status: 'rejected' })}><XCircle size={18} /></button>
                  </div>
                ) : (
                  <span className={item.status === 'approved' ? 'status-badge success' : 'status-badge'}>{item.status}</span>
                )}
              </article>
            ))}
            {!transfers.isLoading && (transfers.data || []).length === 0 && <p className="muted">{t('noTransferRequestsShort')}</p>}
          </div>
          {decideTransfer.isError && <div className="alert alert-error">{getApiErrorMessage(decideTransfer.error, t('couldNotUpdateTransfer'))}</div>}
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('auditTrail')}</span>
            <h2>{t('recentActivity')}</h2>
          </div>
          <div className="compact-list">
            {(auditLogs.data || []).slice(0, 8).map((item) => (
              <article className="compact-row" key={item._id}>
                <Activity size={18} />
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.actor?.name || t('system')} - {formatDateTime(item.createdAt)}</span>
                </div>
              </article>
            ))}
            {!auditLogs.isLoading && (auditLogs.data || []).length === 0 && <p className="muted">{t('noAuditLogs')}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
