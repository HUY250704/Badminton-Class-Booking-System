import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, BarChart3, CalendarDays, CheckCircle2, Download, Edit, Eye, Plus, Search, Trash2, UserRound, UsersRound, XCircle } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, formatDateTime, levelLabel } from '../utils/classUi'

const levels = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

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

export default function AdminDashboard() {
  const qc = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [level, setLevel] = useState('')
  const [reportRange, setReportRange] = useState(defaultReportRange)
  const search = useDebouncedValue(searchInput)

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

  const classes = data?.data || []
  const totalEnrollment = classes.reduce((sum, item) => sum + item.currentStudents, 0)
  const totalCapacity = classes.reduce((sum, item) => sum + item.maxStudents, 0)
  const totalCapacityPercent = totalCapacity > 0 ? `${capacityPercent(totalEnrollment, totalCapacity)}%` : 'N/A'
  const upcomingCount = classes.filter((item) => new Date(item.startDate) >= new Date()).length
  const pastCount = Math.max(classes.length - upcomingCount, 0)
  const reportSummary = reports.data?.summary || {}
  const maxDailyRevenue = Math.max(...(reports.data?.revenueByDay || []).map((item) => item.revenue), 0)
  const monthlyRevenue = metrics.data?.monthlyRevenue || []
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((item) => item.revenue), 0)
  const upcomingClasses = metrics.data?.upcomingClasses || []

  return (
    <div className="admin-layout">
      <section className="section-heading">
        <span className="eyebrow">Admin portal</span>
        <div className="heading-row">
          <div>
            <h1>Class Management</h1>
            <p>Schedule, edit, and monitor active badminton training sessions.</p>
          </div>
          <Link className="button button-primary" to="/admin/create"><Plus size={18} /> Create New Class</Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><span>Total Classes</span><strong>{classes.length}</strong></div>
        <div className="stat-card"><span>Upcoming / Past</span><strong>{upcomingCount}/{pastCount}</strong></div>
        <div className="stat-card"><span>Total Enrollment</span><strong>{totalEnrollment}/{totalCapacity || 0}</strong></div>
        <div className="stat-card"><span>Capacity Filled</span><strong>{totalCapacityPercent}</strong></div>
        <div className="stat-card"><span>Month Revenue</span><strong>{Number(metrics.data?.monthRevenue || 0).toLocaleString('vi-VN')}</strong></div>
        <div className="stat-card"><span>Paid Transactions</span><strong>{metrics.data?.paidTransactions ?? 0}</strong></div>
        <div className="stat-card"><span>New Students</span><strong>{metrics.data?.newStudents ?? 0}</strong></div>
        <div className="stat-card"><span>Overall Fill</span><strong>{metrics.data?.fillRate == null ? 'N/A' : `${metrics.data.fillRate}%`}</strong></div>
      </div>

      <section className="admin-split">
        <div className="report-chart">
          <div className="panel-header compact">
            <BarChart3 size={18} />
            <h2>Monthly Revenue</h2>
          </div>
          <div className="chart-bars">
            {monthlyRevenue.map((item) => (
              <div className="chart-row" key={item.month}>
                <span>{item.month.slice(5)}</span>
                <div><strong style={{ width: `${maxMonthlyRevenue > 0 ? Math.max((item.revenue / maxMonthlyRevenue) * 100, 4) : 0}%` }} /></div>
                <em>{Number(item.revenue).toLocaleString('vi-VN')}</em>
              </div>
            ))}
            {!metrics.isLoading && monthlyRevenue.length === 0 && <p className="muted">No paid revenue in the last six months.</p>}
          </div>
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">Opening soon</span>
            <h2>Upcoming Classes</h2>
          </div>
          <div className="compact-list">
            {upcomingClasses.map((item) => (
              <article className="compact-row" key={item._id}>
                <CalendarDays size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.coachName} - {formatDateTime(item.startDate)}</span>
                  <span>{item.location}</span>
                </div>
                <Link className="button button-secondary button-small" to={`/classes/${item._id}`}>Open</Link>
              </article>
            ))}
            {!metrics.isLoading && upcomingClasses.length === 0 && <p className="muted">No upcoming classes scheduled.</p>}
          </div>
        </div>
      </section>

      <section className="report-panel">
        <div className="panel-header report-header">
          <div>
            <span className="eyebrow">Reports</span>
            <h2>Performance Report</h2>
          </div>
          <div className="report-filters">
            <label className="field">
              From
              <input
                type="date"
                value={reportRange.startDate}
                onChange={(e) => setReportRange((current) => ({ ...current, startDate: e.target.value }))}
              />
            </label>
            <label className="field">
              To
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

        {reports.isError && <div className="alert alert-error">{getApiErrorMessage(reports.error, 'Could not load reports')}</div>}

        <div className="stats-grid report-stats">
          <div className="report-metric"><span>Revenue</span><strong>{Number(reportSummary.revenueTotal || 0).toLocaleString('vi-VN')}</strong></div>
          <div className="report-metric"><span>Paid</span><strong>{reportSummary.paidTransactions ?? 0}</strong></div>
          <div className="report-metric"><span>New Enrollments</span><strong>{reportSummary.newEnrollments ?? 0}</strong></div>
          <div className="report-metric"><span>Cancelled</span><strong>{reportSummary.cancelledEnrollments ?? 0}</strong></div>
          <div className="report-metric"><span>Active Students</span><strong>{reportSummary.activeStudents ?? 0}</strong></div>
          <div className="report-metric"><span>Classes Started</span><strong>{reportSummary.classesStarted ?? 0}</strong></div>
          <div className="report-metric"><span>Attendance</span><strong>{reportSummary.attendanceMarked ?? 0}</strong></div>
          <div className="report-metric"><span>Present Rate</span><strong>{reportSummary.presentRate == null ? 'N/A' : `${reportSummary.presentRate}%`}</strong></div>
        </div>

        <div className="report-split">
          <div className="report-chart">
            <div className="panel-header compact">
              <BarChart3 size={18} />
              <h3>Daily Revenue</h3>
            </div>
            <div className="chart-bars">
              {(reports.data?.revenueByDay || []).slice(0, 14).map((item) => (
                <div className="chart-row" key={item.date}>
                  <span>{item.date.slice(5)}</span>
                  <div><strong style={{ width: `${maxDailyRevenue > 0 ? Math.max((item.revenue / maxDailyRevenue) * 100, 4) : 0}%` }} /></div>
                  <em>{Number(item.revenue).toLocaleString('vi-VN')}</em>
                </div>
              ))}
              {!reports.isLoading && (reports.data?.revenueByDay || []).length === 0 && <p className="muted">No paid revenue in this date range.</p>}
            </div>
          </div>

          <div className="table-card report-table">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Fill</th>
                  <th>Revenue</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {(reports.data?.classBreakdown || []).slice(0, 8).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.title}</strong>
                      <span>{formatDateTime(item.startDate)}</span>
                    </td>
                    <td><strong>{item.activeEnrollments}/{item.maxStudents}</strong><span>{item.fillRate == null ? 'N/A' : `${item.fillRate}%`}</span></td>
                    <td><strong>{Number(item.revenue || 0).toLocaleString('vi-VN')}</strong><span>{item.paidTransactions} paid</span></td>
                    <td><strong>{item.presentRate == null ? 'N/A' : `${item.presentRate}%`}</strong><span>Present rate</span></td>
                  </tr>
                ))}
                {!reports.isLoading && (reports.data?.classBreakdown || []).length === 0 && (
                  <tr>
                    <td colSpan="4"><span>No classes started in this date range.</span></td>
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
            placeholder="Search by class title, coach, or description"
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
          <strong>No classes found</strong>
          <span>Create a class or clear the search and level filters.</span>
          <div className="empty-actions">
            <button className="button button-secondary" type="button" onClick={() => { setSearchInput(''); setLevel('') }}>Reset Filters</button>
            <Link className="button button-dark" to="/admin/create"><Plus size={18} /> Create Class</Link>
          </div>
        </div>
      )}

      {classes.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Class Title</th>
                <th>Level</th>
                <th>Start</th>
                <th>Slots</th>
                <th>Status</th>
                <th>Actions</th>
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
                    <td><span className={isPast ? 'status-badge muted' : 'status-badge success'}>{isPast ? 'Past' : 'Upcoming'}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link title="Details" aria-label={`View ${item.title}`} to={`/classes/${item._id}`}><Eye size={18} /></Link>
                        <Link title="Students" aria-label={`View students for ${item.title}`} to={`/admin/${item._id}/students`}><UsersRound size={18} /></Link>
                        <Link title="Edit" aria-label={`Edit ${item.title}`} to={`/admin/create?id=${item._id}`}><Edit size={18} /></Link>
                        <button title="Delete" aria-label={`Delete ${item.title}`} disabled={remove.isPending} onClick={() => {
                          if (confirm('Delete this class and all enrollments?')) remove.mutate(item._id)
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

      {remove.isError && <div className="alert alert-error">{getApiErrorMessage(remove.error, 'Could not delete class')}</div>}

      <section className="page-card admin-panel">
        <div className="panel-header">
          <span className="eyebrow">Coach management</span>
          <h2>Coach Directory</h2>
        </div>
        <div className="compact-list">
          {(coaches.data || []).slice(0, 6).map((coach) => (
            <article className="compact-row" key={coach._id}>
              <div className="compact-avatar">
                {coach.photoUrl ? <img src={coach.photoUrl} alt="" /> : <UserRound size={20} />}
              </div>
              <div>
                <strong>{coach.name}</strong>
                <span>{coach.bio || 'No bio yet.'}</span>
                <span>{(coach.specialties || []).join(', ') || 'No specialties listed.'}</span>
                <span>{coach.teachingSchedule?.[0] ? `Next: ${coach.teachingSchedule[0].title} - ${formatDateTime(coach.teachingSchedule[0].startDate)}` : 'No upcoming teaching schedule.'}</span>
              </div>
              <Link className="button button-secondary button-small" to="/admin/create">Assign</Link>
            </article>
          ))}
          {!coaches.isLoading && (coaches.data || []).length === 0 && <p className="muted">No coach profiles yet. Create one from the class editor.</p>}
        </div>
      </section>

      <section className="admin-split">
        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">Schedule requests</span>
            <h2>Transfer Queue</h2>
          </div>
          <div className="compact-list">
            {(transfers.data || []).slice(0, 6).map((item) => (
              <article className="compact-row" key={item._id}>
                <div>
                  <strong>{item.user?.name || 'Student'}</strong>
                  <span>{item.fromClass?.title || 'Old class'} to {item.toClass?.title || 'New class'}</span>
                </div>
                {item.status === 'pending' ? (
                  <div className="table-actions">
                    <button title="Approve" disabled={decideTransfer.isPending} onClick={() => decideTransfer.mutate({ id: item._id, status: 'approved' })}><CheckCircle2 size={18} /></button>
                    <button title="Reject" disabled={decideTransfer.isPending} onClick={() => decideTransfer.mutate({ id: item._id, status: 'rejected' })}><XCircle size={18} /></button>
                  </div>
                ) : (
                  <span className={item.status === 'approved' ? 'status-badge success' : 'status-badge'}>{item.status}</span>
                )}
              </article>
            ))}
            {!transfers.isLoading && (transfers.data || []).length === 0 && <p className="muted">No transfer requests.</p>}
          </div>
          {decideTransfer.isError && <div className="alert alert-error">{getApiErrorMessage(decideTransfer.error, 'Could not update transfer')}</div>}
        </div>

        <div className="page-card admin-panel">
          <div className="panel-header">
            <span className="eyebrow">Audit trail</span>
            <h2>Recent Activity</h2>
          </div>
          <div className="compact-list">
            {(auditLogs.data || []).slice(0, 8).map((item) => (
              <article className="compact-row" key={item._id}>
                <Activity size={18} />
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.actor?.name || 'System'} - {formatDateTime(item.createdAt)}</span>
                </div>
              </article>
            ))}
            {!auditLogs.isLoading && (auditLogs.data || []).length === 0 && <p className="muted">No audit logs yet.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
