import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, MapPin, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, classImage, formatDateTime, levelLabel } from '../utils/classUi'

const initialForm = {
  title: '',
  description: '',
  coachName: '',
  level: 'beginner',
  startDate: '',
  schedule: '',
  location: '',
  maxStudents: 10
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function AdminCreateClass() {
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const existingClass = useQuery({
    queryKey: ['class', editId],
    queryFn: () => api.get(`/classes/${editId}`).then((r) => r.data),
    enabled: Boolean(editId)
  })

  useEffect(() => {
    if (!existingClass.data) return
    const item = existingClass.data
    setForm({
      title: item.title,
      description: item.description,
      coachName: item.coachName,
      level: item.level,
      startDate: toDatetimeLocal(item.startDate),
      schedule: item.schedule,
      location: item.location,
      maxStudents: item.maxStudents
    })
  }, [existingClass.data])

  const save = useMutation({
    mutationFn: (payload) => {
      if (editId) return api.patch(`/classes/${editId}`, payload).then((r) => r.data)
      return api.post('/classes', payload).then((r) => r.data)
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['class', editId || item._id] })
      navigate(editId ? `/classes/${editId}` : '/admin')
    }
  })

  function update(field, value) {
    setFormError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      coachName: form.coachName.trim(),
      schedule: form.schedule.trim(),
      location: form.location.trim(),
      maxStudents: Number(form.maxStudents)
    }

    if (!payload.title || !payload.description || !payload.coachName || !payload.schedule || !payload.location) {
      setFormError('Please fill in all class details.')
      return
    }

    if (!Number.isInteger(payload.maxStudents) || payload.maxStudents < 1) {
      setFormError('Max students must be a positive whole number.')
      return
    }

    if (new Date(payload.startDate) < new Date()) {
      setFormError('Start date cannot be in the past.')
      return
    }

    save.mutate(payload)
  }

  if (existingClass.isLoading) return <div className="page-card skeleton-card tall" />
  if (existingClass.isError) return <div className="alert alert-error">{getApiErrorMessage(existingClass.error, 'Could not load class')}</div>

  return (
    <div className="form-page">
      <section className="section-heading">
        <span className="eyebrow">Admin portal</span>
        <h1>{editId ? 'Edit Class' : 'Create Class'}</h1>
        <p>{editId ? 'Update class information and capacity.' : 'Add a new upcoming badminton training session.'}</p>
      </section>

      <div className="editor-layout">
        <form className="page-card admin-form" onSubmit={submit}>
          <label className="field"><span>Title</span><input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Smash Fundamentals" /></label>
          <label className="field"><span>Description</span><textarea required rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What students will practice in this session." /></label>
          <div className="form-grid">
            <label className="field"><span>Coach</span><input required value={form.coachName} onChange={(e) => update('coachName', e.target.value)} placeholder="Coach name" /></label>
            <label className="field">
              <span>Level</span>
              <select value={form.level} onChange={(e) => update('level', e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="field"><span>Start Date</span><input required type="datetime-local" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} /></label>
            <label className="field"><span>Schedule</span><input required value={form.schedule} onChange={(e) => update('schedule', e.target.value)} placeholder="Every Tue, 7:00 PM" /></label>
            <label className="field"><span>Location</span><input required value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Court 3, NAPA" /></label>
            <label className="field"><span>Max Students</span><input required min="1" type="number" value={form.maxStudents} onChange={(e) => update('maxStudents', e.target.value)} /></label>
          </div>
          <div className="form-actions">
            <Link className="button button-secondary" to={editId ? `/classes/${editId}` : '/admin'}><ArrowLeft size={18} /> Cancel</Link>
            <button className="button button-primary" disabled={save.isPending} type="submit">{save.isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Class'}</button>
          </div>
          {formError && <div className="alert alert-error">{formError}</div>}
          {save.isError && <div className="alert alert-error">{getApiErrorMessage(save.error, 'Could not save class')}</div>}
        </form>

        <aside className="class-card preview-card">
          <div className="class-image">
            <img src={classImage(form.level)} alt="Class preview" />
            <span className={`level-badge ${form.level}`}>{levelLabel(form.level)}</span>
          </div>
          <div className="class-body">
            <span className="eyebrow">Live preview</span>
            <h2>{form.title || 'Class title'}</h2>
            <p>{form.description || 'Class description will appear here as students browse upcoming sessions.'}</p>
            <div className="meta-list">
              <span><UserRound size={18} /> {form.coachName || 'Coach'}</span>
              <span><MapPin size={18} /> {form.location || 'Location'}</span>
              <span><CalendarDays size={18} /> {formatDateTime(form.startDate)}</span>
            </div>
            <div className="capacity-row">
              <span>0/{Number(form.maxStudents) || 1} spots filled</span>
              <strong>{Number(form.maxStudents) || 1} spots left</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${capacityPercent(0, Number(form.maxStudents) || 1)}%` }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
