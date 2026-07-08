import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Image, MapPin, Plus, UserRound } from 'lucide-react'
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
  maxStudents: 10,
  price: 500000,
  imageUrl: '',
  coach: ''
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function AdminCreateClass() {
  const [form, setForm] = useState(initialForm)
  const [coachDraft, setCoachDraft] = useState({ name: '', email: '', bio: '', photoUrl: '', specialties: '' })
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState('')
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

  const coaches = useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get('/coaches').then((r) => r.data)
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
      maxStudents: item.maxStudents,
      price: item.price ?? 500000,
      imageUrl: item.imageUrl || '',
      coach: item.coach?._id || ''
    })
    setLoadedUpdatedAt(item.updatedAt || '')
  }, [existingClass.data])

  const save = useMutation({
    mutationFn: (payload) => {
      if (editId) return api.patch(`/classes/${editId}`, payload).then((r) => r.data)
      return api.post('/classes', payload).then((r) => r.data)
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['classes'], exact: false, refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['class', editId || item._id] })
      navigate(editId ? `/classes/${editId}` : '/admin')
    }
  })

  const createCoach = useMutation({
    mutationFn: (payload) => api.post('/coaches', payload).then((r) => r.data),
    onSuccess: (coach) => {
      qc.invalidateQueries({ queryKey: ['coaches'] })
      setForm((current) => ({ ...current, coach: coach._id, coachName: coach.name }))
      setCoachDraft({ name: '', email: '', bio: '', photoUrl: '', specialties: '' })
    }
  })

  const uploadClassImage = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'classes')
      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: (result) => update('imageUrl', result.url)
  })

  const uploadCoachPhoto = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'coaches')
      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: (result) => setCoachDraft((draft) => ({ ...draft, photoUrl: result.url }))
  })

  function update(field, value) {
    setFormError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  function selectCoach(value) {
    const coach = (coaches.data || []).find((item) => item._id === value)
    setFormError('')
    setForm((current) => ({
      ...current,
      coach: value,
      coachName: coach?.name || current.coachName
    }))
  }

  function submitCoach(event) {
    event.preventDefault()
    if (!coachDraft.name.trim()) {
      setFormError('Coach name is required.')
      return
    }
    createCoach.mutate({
      ...coachDraft,
      name: coachDraft.name.trim(),
      email: coachDraft.email.trim(),
      bio: coachDraft.bio.trim(),
      photoUrl: coachDraft.photoUrl.trim()
    })
  }

  async function submit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      coachName: form.coachName.trim(),
      schedule: form.schedule.trim(),
      location: form.location.trim(),
      maxStudents: Number(form.maxStudents),
      price: Number(form.price)
    }

    if (!payload.title || !payload.description || !payload.coachName || !payload.schedule || !payload.location) {
      setFormError('Please fill in all class details.')
      return
    }

    if (!Number.isInteger(payload.maxStudents) || payload.maxStudents < 1) {
      setFormError('Max students must be a positive whole number.')
      return
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setFormError('Class price must be a non-negative number.')
      return
    }

    if (new Date(payload.startDate) < new Date()) {
      setFormError('Start date cannot be in the past.')
      return
    }

    if (editId) {
      let latestClass = existingClass.data

      try {
        const result = await existingClass.refetch()
        if (result.isError) {
          setFormError(getApiErrorMessage(result.error, 'Could not refresh class details before saving. Please try again.'))
          return
        }
        latestClass = result.data || latestClass
      } catch {
        setFormError('Could not refresh class details before saving. Please try again.')
        return
      }

      const currentStudents = latestClass?.currentStudents || 0
      if (payload.maxStudents < currentStudents) {
        setFormError(`This class currently has ${currentStudents} enrolled students. Max students cannot be lower than ${currentStudents}.`)
        return
      }
      payload.updatedAt = latestClass?.updatedAt || loadedUpdatedAt
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
            <label className="field">
              <span>Coach profile</span>
              <select value={form.coach} onChange={(e) => selectCoach(e.target.value)}>
                <option value="">Use typed coach name</option>
                {(coaches.data || []).map((coach) => (
                  <option key={coach._id} value={coach._id}>{coach.name}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Coach name</span><input required value={form.coachName} onChange={(e) => update('coachName', e.target.value)} placeholder="Coach name" /></label>
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
            <label className="field"><span>Max Students</span><input required min={editId ? Math.max(existingClass.data?.currentStudents || 1, 1) : 1} type="number" value={form.maxStudents} onChange={(e) => update('maxStudents', e.target.value)} /></label>
            <label className="field"><span>Price (VND)</span><input required min="0" step="1000" type="number" value={form.price} onChange={(e) => update('price', e.target.value)} /></label>
            <label className="field">
              <span>Class image URL</span>
              <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span>Upload class image</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadClassImage.mutate(file)
              }} />
            </label>
          </div>
          {uploadClassImage.isPending && <div className="alert alert-success">Uploading class image...</div>}
          {uploadClassImage.isError && <div className="alert alert-error">{getApiErrorMessage(uploadClassImage.error, 'Could not upload class image')}</div>}
          <div className="form-actions">
            <Link className="button button-secondary" to={editId ? `/classes/${editId}` : '/admin'}><ArrowLeft size={18} /> Cancel</Link>
            <button className="button button-primary" disabled={save.isPending || existingClass.isFetching} type="submit">{save.isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Class'}</button>
          </div>
          {formError && <div className="alert alert-error">{formError}</div>}
          {save.isError && <div className="alert alert-error">{getApiErrorMessage(save.error, 'Could not save class')}</div>}
        </form>

        <aside className="class-card preview-card">
          <div className="class-image">
            <img src={form.imageUrl || classImage(form.level)} alt="Class preview" />
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
              <span>{existingClass.data?.currentStudents || 0}/{Number(form.maxStudents) || 1} spots filled</span>
              <strong>{Math.max((Number(form.maxStudents) || 1) - (existingClass.data?.currentStudents || 0), 0)} spots left</strong>
            </div>
            <div className="capacity-row">
              <span>Class fee</span>
              <strong>{Number(form.price || 0).toLocaleString('vi-VN')} VND</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${capacityPercent(existingClass.data?.currentStudents || 0, Number(form.maxStudents) || 1)}%` }} />
            </div>
          </div>
          <form className="class-body" onSubmit={submitCoach}>
            <span className="eyebrow">Coach entity</span>
            <h2>Create Coach</h2>
            <label className="field"><span>Name</span><input value={coachDraft.name} onChange={(e) => setCoachDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder="Coach name" /></label>
            <label className="field"><span>Email</span><input type="email" value={coachDraft.email} onChange={(e) => setCoachDraft((draft) => ({ ...draft, email: e.target.value }))} placeholder="coach@napa.vn" /></label>
            <label className="field"><span>Bio</span><textarea rows="3" value={coachDraft.bio} onChange={(e) => setCoachDraft((draft) => ({ ...draft, bio: e.target.value }))} placeholder="Short coaching profile" /></label>
            <label className="field"><span>Photo URL</span><div className="field-control"><Image size={18} /><input value={coachDraft.photoUrl} onChange={(e) => setCoachDraft((draft) => ({ ...draft, photoUrl: e.target.value }))} placeholder="https://..." /></div></label>
            <label className="field">
              <span>Upload coach photo</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadCoachPhoto.mutate(file)
              }} />
            </label>
            <label className="field"><span>Specialties</span><input value={coachDraft.specialties} onChange={(e) => setCoachDraft((draft) => ({ ...draft, specialties: e.target.value }))} placeholder="Footwork, Doubles" /></label>
            <button className="button button-secondary" disabled={createCoach.isPending} type="submit"><Plus size={18} /> {createCoach.isPending ? 'Creating...' : 'Create Coach'}</button>
            {uploadCoachPhoto.isPending && <div className="alert alert-success">Uploading coach photo...</div>}
            {uploadCoachPhoto.isError && <div className="alert alert-error">{getApiErrorMessage(uploadCoachPhoto.error, 'Could not upload coach photo')}</div>}
            {createCoach.isError && <div className="alert alert-error">{getApiErrorMessage(createCoach.error, 'Could not create coach')}</div>}
          </form>
        </aside>
      </div>
    </div>
  )
}
