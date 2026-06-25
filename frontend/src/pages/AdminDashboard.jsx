import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Edit, Eye, Plus, Search, Trash2, UsersRound } from 'lucide-react'
import api from '../api/axios'
import { capacityPercent, formatDateTime, levelLabel } from '../utils/classUi'

const levels = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

export default function AdminDashboard() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['classes', { page: 1, search, level, admin: true, includePast: true }],
    queryFn: () => api.get('/classes', { params: { page: 1, limit: 50, search, level, includePast: true } }).then((r) => r.data)
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/classes/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
  })

  const classes = data?.data || []
  const totalEnrollment = classes.reduce((sum, item) => sum + item.currentStudents, 0)
  const totalCapacity = classes.reduce((sum, item) => sum + item.maxStudents, 0)
  const upcomingCount = classes.filter((item) => new Date(item.startDate) >= new Date()).length
  const pastCount = Math.max(classes.length - upcomingCount, 0)

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
        <div className="stat-card"><span>Capacity Filled</span><strong>{capacityPercent(totalEnrollment, totalCapacity || 1)}%</strong></div>
      </div>

      <section className="admin-controls">
        <label className="admin-search">
          <Search size={18} />
          <input
            placeholder="Search by class title, coach, or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
      {isError && <div className="alert alert-error">{error?.response?.data?.message || 'Could not load classes'}</div>}
      {!isLoading && classes.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>No classes found</strong>
          <span>Create a class or clear the search and level filters.</span>
          <div className="empty-actions">
            <button className="button button-secondary" type="button" onClick={() => { setSearch(''); setLevel('') }}>Reset Filters</button>
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
                        <Link title="Details" to={`/classes/${item._id}`}><Eye size={18} /></Link>
                        <Link title="Students" to={`/admin/${item._id}/students`}><UsersRound size={18} /></Link>
                        <Link title="Edit" to={`/admin/create?id=${item._id}`}><Edit size={18} /></Link>
                        <button title="Delete" disabled={remove.isPending} onClick={() => {
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

      {remove.isError && <div className="alert alert-error">{remove.error?.response?.data?.message || 'Could not delete class'}</div>}
    </div>
  )
}
