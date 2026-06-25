import React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Edit, Eye, Plus, Trash2, UsersRound } from 'lucide-react'
import api from '../api/axios'
import { capacityPercent, formatDateTime, levelLabel } from '../utils/classUi'

export default function AdminDashboard() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['classes', { page: 1, search: '', level: '', admin: true }],
    queryFn: () => api.get('/classes', { params: { page: 1, limit: 50 } }).then((r) => r.data)
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
        <div className="stat-card"><span>Active Classes</span><strong>{classes.length}</strong></div>
        <div className="stat-card"><span>Total Enrollment</span><strong>{totalEnrollment}/{totalCapacity || 0}</strong></div>
        <div className="stat-card"><span>Capacity Filled</span><strong>{capacityPercent(totalEnrollment, totalCapacity || 1)}%</strong></div>
      </div>

      {isLoading && <div className="page-card skeleton-card tall" />}
      {isError && <div className="alert alert-error">{error?.response?.data?.message || 'Could not load classes'}</div>}
      {!isLoading && classes.length === 0 && (
        <div className="empty-state empty-state-action">
          <CalendarDays size={24} />
          <strong>No upcoming classes</strong>
          <span>Create the first class so students can start booking.</span>
          <Link className="button button-dark" to="/admin/create"><Plus size={18} /> Create Class</Link>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {remove.isError && <div className="alert alert-error">{remove.error?.response?.data?.message || 'Could not delete class'}</div>}
    </div>
  )
}
