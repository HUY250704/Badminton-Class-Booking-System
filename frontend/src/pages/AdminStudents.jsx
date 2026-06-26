import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../utils/classUi'

export default function AdminStudents() {
  const { id } = useParams()
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['class-students', id],
    queryFn: () => api.get(`/classes/${id}/students`).then((r) => r.data)
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load students')}</div>

  return (
    <div className="stack">
      <section className="section-heading">
        <span className="eyebrow">Admin roster</span>
        <div className="heading-row">
          <div>
            <h1>Students</h1>
            <p>{data.length} enrolled student{data.length === 1 ? '' : 's'} in this class.</p>
          </div>
          <Link className="button button-secondary" to="/admin"><ArrowLeft size={18} /> Back to Admin</Link>
        </div>
      </section>

      {data.length === 0 && <div className="empty-state">No students enrolled yet.</div>}

      <div className="roster-list">
        {data.map((item) => (
          <article className="student-row" key={item.id}>
            <div className="avatar"><UserRound size={22} /></div>
            <div>
              <h2>{item.user.name}</h2>
              <p><Mail size={16} /> {item.user.email}</p>
            </div>
            <span className="student-date">Enrolled {formatDateTime(item.enrolledAt)}</span>
          </article>
        ))}
      </div>
    </div>
  )
}
