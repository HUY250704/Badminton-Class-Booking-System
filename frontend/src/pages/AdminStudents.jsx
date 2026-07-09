import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Eye, Mail, Trash2, UserRound, XCircle } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

export default function AdminStudents() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['class-students', id],
    queryFn: () => api.get(`/classes/${id}/students`).then((r) => r.data)
  })
  const attendance = useQuery({
    queryKey: ['class-attendance', id],
    queryFn: () => api.get(`/classes/${id}/attendance`).then((r) => r.data)
  })
  const markAttendance = useMutation({
    mutationFn: ({ user, status }) => api.put(`/classes/${id}/attendance`, {
      date: new Date().toISOString(),
      records: [{ user, status }]
    }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-attendance', id] })
  })
  const removeStudent = useMutation({
    mutationFn: (userId) => api.delete(`/classes/${id}/students/${userId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-students', id] })
      qc.invalidateQueries({ queryKey: ['class', id] })
      qc.invalidateQueries({ queryKey: ['classes'], exact: false })
    }
  })

  const todayKey = new Date().toDateString()
  const attendanceMap = new Map((attendance.data?.attendance || [])
    .filter((item) => new Date(item.date).toDateString() === todayKey)
    .map((item) => [item.user, item.status]))
  const attendanceStats = new Map()
  ;(attendance.data?.attendance || []).forEach((item) => {
    const key = typeof item.user === 'string' ? item.user : item.user?._id
    if (!key) return
    const current = attendanceStats.get(key) || { total: 0, present: 0 }
    current.total += 1
    if (item.status === 'present') current.present += 1
    attendanceStats.set(key, current)
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, t('couldNotLoadStudents'))}</div>

  return (
    <div className="stack">
      <section className="section-heading">
        <span className="eyebrow">{t('adminRoster')}</span>
        <div className="heading-row">
          <div>
            <h1>{t('students')}</h1>
            <p>{data.length} {t('enrolledStudentsCount')}</p>
          </div>
          <div className="form-actions">
            <Link className="button button-secondary" to="/admin"><ArrowLeft size={18} /> {t('backToAdmin')}</Link>
            <Link className="button button-dark" to={`/classes/${id}`}><Eye size={18} /> {t('classDetail')}</Link>
          </div>
        </div>
      </section>

      {data.length === 0 && <div className="empty-state">{t('noStudentsYet')}</div>}

      <div className="roster-list">
        {data.map((item) => (
          <article className="student-row" key={item.id}>
            <div className="avatar"><UserRound size={22} /></div>
            <div>
              <h2>{item.user.name}</h2>
              <p><Mail size={16} /> {item.user.email}</p>
            </div>
            <span className="student-date">{t('enrolledAt')} {formatDateTime(item.enrolledAt)}</span>
            <div className="attendance-actions">
              <span className="status-badge">{t(attendanceMap.get(item.user._id) || 'unmarked')}</span>
              <span className="status-badge">
                {attendanceStats.get(item.user._id)?.total
                  ? `${Math.round((attendanceStats.get(item.user._id).present / attendanceStats.get(item.user._id).total) * 100)}%`
                  : '0%'}
              </span>
              <button title={t('present')} aria-label={`${t('present')} ${item.user.name}`} disabled={markAttendance.isPending} onClick={() => markAttendance.mutate({ user: item.user._id, status: 'present' })}><CheckCircle2 size={18} /></button>
              <button title={t('absent')} aria-label={`${t('absent')} ${item.user.name}`} disabled={markAttendance.isPending} onClick={() => markAttendance.mutate({ user: item.user._id, status: 'absent' })}><XCircle size={18} /></button>
              <button
                title={t('removeStudent')}
                aria-label={`${t('removeStudent')} ${item.user.name}`}
                disabled={removeStudent.isPending}
                onClick={() => {
                  if (window.confirm(`${t('removeStudentConfirm')} ${item.user.name}`)) {
                    removeStudent.mutate(item.user._id)
                  }
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {markAttendance.isError && <div className="alert alert-error">{getApiErrorMessage(markAttendance.error, t('couldNotMarkAttendance'))}</div>}
      {removeStudent.isError && <div className="alert alert-error">{getApiErrorMessage(removeStudent.error, t('couldNotRemoveStudent'))}</div>}
    </div>
  )
}
