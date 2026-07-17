import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Image, MapPin, Plus, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { capacityPercent, capacityText, classImage, formatDateTime, levelLabel } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

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
  const { language, t } = useTranslation()
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
      setFormError(t('coachNameRequired'))
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
      setFormError(t('fillClassDetails'))
      return
    }

    if (!Number.isInteger(payload.maxStudents) || payload.maxStudents < 1) {
      setFormError(t('maxStudentsPositive'))
      return
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setFormError(t('priceNonNegative'))
      return
    }

    if (new Date(payload.startDate) < new Date()) {
      setFormError(t('startDatePast'))
      return
    }

    if (editId) {
      let latestClass = existingClass.data

      try {
        const result = await existingClass.refetch()
        if (result.isError) {
          setFormError(getApiErrorMessage(result.error, t('refreshBeforeSavingFailed')))
          return
        }
        latestClass = result.data || latestClass
      } catch {
        setFormError(t('refreshBeforeSavingFailed'))
        return
      }

      const currentStudents = latestClass?.currentStudents || 0
      if (payload.maxStudents < currentStudents) {
        setFormError(`${t('maxStudentsLowerThanCurrent')} (${currentStudents}).`)
        return
      }
      payload.updatedAt = latestClass?.updatedAt || loadedUpdatedAt
    }

    save.mutate(payload)
  }

  if (existingClass.isLoading) return <div className="page-card skeleton-card tall" />
  if (existingClass.isError) return <div className="alert alert-error">{getApiErrorMessage(existingClass.error, t('couldNotLoadClass'))}</div>

  return (
    <div className="form-page">
      <section className="section-heading">
        <span className="eyebrow">{t('adminPortal')}</span>
        <h1>{editId ? t('editClassTitle') : t('createClassTitle')}</h1>
        <p>{editId ? t('updateClassInfo') : t('addTrainingSession')}</p>
      </section>

      <div className="editor-layout">
        <form className="page-card admin-form" onSubmit={submit}>
          <label className="field"><span>{t('title')}</span><input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder={language === 'en' ? 'Smash Fundamentals' : 'Nền tảng đập cầu'} /></label>
          <label className="field"><span>{t('description')}</span><textarea required rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder={language === 'en' ? 'What students will practice in this session.' : 'Nội dung học viên sẽ luyện tập trong buổi này.'} /></label>
          <div className="form-grid">
            <label className="field">
              <span>{t('coachProfile')}</span>
              <select value={form.coach} onChange={(e) => selectCoach(e.target.value)}>
                <option value="">{t('useTypedCoachName')}</option>
                {(coaches.data || []).map((coach) => (
                  <option key={coach._id} value={coach._id}>{coach.name}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>{t('coachName')}</span><input required value={form.coachName} onChange={(e) => update('coachName', e.target.value)} placeholder={t('coachName')} /></label>
            <label className="field">
              <span>{t('level')}</span>
              <select value={form.level} onChange={(e) => update('level', e.target.value)}>
                <option value="beginner">{levelLabel('beginner')}</option>
                <option value="intermediate">{levelLabel('intermediate')}</option>
                <option value="advanced">{levelLabel('advanced')}</option>
              </select>
            </label>
            <label className="field"><span>{t('startDate')}</span><input required type="datetime-local" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} /></label>
            <label className="field"><span>{t('schedule')}</span><input required value={form.schedule} onChange={(e) => update('schedule', e.target.value)} placeholder={language === 'en' ? 'Every Tue, 7:00 PM' : 'Mỗi Thứ Ba, 19:00'} /></label>
            <label className="field"><span>{t('location')}</span><input required value={form.location} onChange={(e) => update('location', e.target.value)} placeholder={language === 'en' ? 'Court 3, NAPA' : 'Sân 3, NAPA'} /></label>
            <label className="field"><span>{t('maxStudents')}</span><input required min={editId ? Math.max(existingClass.data?.currentStudents || 1, 1) : 1} type="number" value={form.maxStudents} onChange={(e) => update('maxStudents', e.target.value)} /></label>
            <label className="field"><span>{t('priceVnd')}</span><input required min="0" step="1000" type="number" value={form.price} onChange={(e) => update('price', e.target.value)} /></label>
            <label className="field">
              <span>{t('classImageUrl')}</span>
              <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span>{t('uploadClassImage')}</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadClassImage.mutate(file)
              }} />
            </label>
          </div>
          {uploadClassImage.isPending && <div className="alert alert-success">{t('uploadingClassImage')}</div>}
          {uploadClassImage.isError && <div className="alert alert-error">{getApiErrorMessage(uploadClassImage.error, t('couldNotUploadClassImage'))}</div>}
          <div className="form-actions">
            <Link className="button button-secondary" to={editId ? `/classes/${editId}` : '/admin'}><ArrowLeft size={18} /> {t('cancel')}</Link>
            <button className="button button-primary" disabled={save.isPending || existingClass.isFetching} type="submit">{save.isPending ? t('saving') : editId ? t('saveChanges') : t('createClass')}</button>
          </div>
          {formError && <div className="alert alert-error">{formError}</div>}
          {save.isError && <div className="alert alert-error">{getApiErrorMessage(save.error, t('couldNotSaveClass'))}</div>}
        </form>

        <aside className="class-card preview-card">
          <div className="class-image">
            <img src={form.imageUrl || classImage(form.level)} alt="Class preview" />
            <span className={`level-badge ${form.level}`}>{levelLabel(form.level)}</span>
          </div>
          <div className="class-body">
            <span className="eyebrow">{t('livePreview')}</span>
            <h2>{form.title || t('classTitle')}</h2>
            <p>{form.description || t('classDescriptionPreview')}</p>
            <div className="meta-list">
              <span><UserRound size={18} /> {form.coachName || t('coach')}</span>
              <span><MapPin size={18} /> {form.location || t('location')}</span>
              <span><CalendarDays size={18} /> {formatDateTime(form.startDate)}</span>
            </div>
            <div className="capacity-row">
              <span>{existingClass.data?.currentStudents || 0}/{Number(form.maxStudents) || 1} {t('spotsFilled')}</span>
              <strong>{capacityText(existingClass.data?.currentStudents || 0, Number(form.maxStudents) || 1)}</strong>
            </div>
            <div className="capacity-row">
              <span>{t('classFee')}</span>
              <strong>{Number(form.price || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} VND</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${capacityPercent(existingClass.data?.currentStudents || 0, Number(form.maxStudents) || 1)}%` }} />
            </div>
          </div>
          <div className="class-body">
            <span className="eyebrow">{t('coachEntity')}</span>
            <h2>{t('createCoach')}</h2>
            <label className="field"><span>{t('name')}</span><input value={coachDraft.name} onChange={(e) => setCoachDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder={t('coachName')} /></label>
            <label className="field"><span>{t('email')}</span><input type="email" value={coachDraft.email} onChange={(e) => setCoachDraft((draft) => ({ ...draft, email: e.target.value }))} placeholder="coach@napa.vn" /></label>
            <label className="field"><span>{t('bio')}</span><textarea rows="3" value={coachDraft.bio} onChange={(e) => setCoachDraft((draft) => ({ ...draft, bio: e.target.value }))} placeholder={language === 'en' ? 'Short coaching profile' : 'Hồ sơ huấn luyện ngắn'} /></label>
            <label className="field"><span>{t('photoUrl')}</span><div className="field-control"><Image size={18} /><input value={coachDraft.photoUrl} onChange={(e) => setCoachDraft((draft) => ({ ...draft, photoUrl: e.target.value }))} placeholder="https://..." /></div></label>
            <label className="field">
              <span>{t('uploadCoachPhoto')}</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadCoachPhoto.mutate(file)
              }} />
            </label>
            <label className="field"><span>{t('specialties')}</span><input value={coachDraft.specialties} onChange={(e) => setCoachDraft((draft) => ({ ...draft, specialties: e.target.value }))} placeholder={language === 'en' ? 'Footwork, Doubles' : 'Di chuyển, Đánh đôi'} /></label>
            <button className="button button-secondary" disabled={createCoach.isPending} type="button" onClick={submitCoach}><Plus size={18} /> {createCoach.isPending ? t('creating') : t('createCoach')}</button>
            {uploadCoachPhoto.isPending && <div className="alert alert-success">{t('uploadingCoachPhoto')}</div>}
            {uploadCoachPhoto.isError && <div className="alert alert-error">{getApiErrorMessage(uploadCoachPhoto.error, t('couldNotUploadCoachPhoto'))}</div>}
            {createCoach.isError && <div className="alert alert-error">{getApiErrorMessage(createCoach.error, t('couldNotCreateCoach'))}</div>}
          </div>
        </aside>
      </div>
    </div>
  )
}
