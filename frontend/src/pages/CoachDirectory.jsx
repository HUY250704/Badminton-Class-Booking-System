import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Edit, Image, Mail, Phone, Save, Search, Sparkles, Trophy, UserRound, X } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { getUser } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

const fallbackCoachImage = 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80'

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

function coachToDraft(coach) {
  return {
    name: coach.name || '',
    title: coach.title || '',
    email: coach.email || '',
    phone: coach.phone || '',
    birthday: coach.birthday || '',
    gender: coach.gender || '',
    photoUrl: coach.photoUrl || '',
    bio: coach.bio || '',
    specialties: (coach.specialties || []).join(', '),
    certificates: (coach.certificates || []).join('\n'),
    yearsExperience: coach.yearsExperience || 0
  }
}

export default function CoachDirectory() {
  const qc = useQueryClient()
  const user = getUser()
  const isAdmin = user?.role === 'admin'
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState(null)
  const [editError, setEditError] = useState('')
  const search = useDebouncedValue(searchInput)

  const coaches = useQuery({
    queryKey: ['coaches', { search }],
    queryFn: () => api.get('/coaches', { params: { search } }).then((r) => r.data),
    placeholderData: (previousData) => previousData
  })

  const updateCoach = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/coaches/${id}`, payload).then((r) => r.data),
    onSuccess: (coach) => {
      setEditingId('')
      setDraft(null)
      setEditError('')
      qc.invalidateQueries({ queryKey: ['coaches'] })
      qc.invalidateQueries({ queryKey: ['coach', coach._id] })
    }
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
    onSuccess: (result) => updateDraft('photoUrl', result.url)
  })

  function startEdit(coach) {
    setEditingId(coach._id)
    setDraft(coachToDraft(coach))
    setEditError('')
  }

  function updateDraft(field, value) {
    setEditError('')
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function submitEdit(event, coachId) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setEditError(t('coachNameRequired', 'Coach name is required.'))
      return
    }

    updateCoach.mutate({
      id: coachId,
      payload: {
        ...draft,
        name: draft.name.trim(),
        title: draft.title.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        birthday: draft.birthday.trim(),
        gender: draft.gender.trim(),
        photoUrl: draft.photoUrl.trim(),
        bio: draft.bio.trim(),
        specialties: draft.specialties,
        certificates: draft.certificates,
        yearsExperience: Number(draft.yearsExperience || 0)
      }
    })
  }

  return (
    <div className="stack">
      <section className="section-heading">
        <span className="eyebrow">{t('coachManagement', 'Coach management')}</span>
        <div className="heading-row">
          <div>
            <h1>{t('coachDirectory', 'Coach Directory')}</h1>
            <p>{t('coachDirectoryDescription', 'Browse coach profiles, specialties, and upcoming teaching schedules.')}</p>
          </div>
          {isAdmin && <Link className="button button-primary" to="/admin/create">{t('createCoach', 'Create Coach')}</Link>}
        </div>
      </section>

      <section className="admin-controls">
        <label className="admin-search">
          <Search size={18} />
          <input
            placeholder={t('searchCoachPlaceholder', 'Search coach name, email, or bio')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        {coaches.isFetching && <span className="status-badge">{t('updating', 'Updating...')}</span>}
      </section>

      {coaches.isLoading && <div className="page-card skeleton-card tall" />}
      {coaches.isError && <div className="alert alert-error">{getApiErrorMessage(coaches.error, t('couldNotLoadCoaches', 'Could not load coaches'))}</div>}

      <div className="card-grid coach-directory-grid">
        {(coaches.data?.data || []).map((coach) => {
          const isEditing = editingId === coach._id
          const specialties = coach.specialties || []
          const photoUrl = isEditing ? draft?.photoUrl : coach.photoUrl
          return (
            <article className="class-card coach-directory-card" key={coach._id}>
              <div className="class-image coach-card-image">
                <img src={photoUrl || fallbackCoachImage} alt={`${coach.name} coach portrait`} />
              </div>
              <div className="class-body">
                {!isEditing && (
                  <>
                    <h2>{coach.name}</h2>
                    <p>{coach.title || coach.bio || t('noBioYet', 'No bio yet.')}</p>
                    <div className="meta-list">
                      {coach.email && <span><Mail size={18} /> {coach.email}</span>}
                      {coach.phone && <span><Phone size={18} /> {coach.phone}</span>}
                      {coach.yearsExperience > 0 && <span><Trophy size={18} /> {coach.yearsExperience} {t('yearsExperience', 'years experience')}</span>}
                      <span><Award size={18} /> {coach.certificates?.length || 0} {t('certificates', 'certificates')}</span>
                    </div>
                    <div className="filter-pills">
                      {specialties.slice(0, 4).map((item) => <span className="pill active" key={item}><Sparkles size={16} /> {item}</span>)}
                      {specialties.length === 0 && <span className="muted">{t('noSpecialtiesListed', 'No specialties listed.')}</span>}
                    </div>
                    <div className="coach-card-actions">
                      <Link className="button button-dark" to={`/coaches/${coach._id}`}><UserRound size={18} /> {t('viewProfile', 'View profile')}</Link>
                      {isAdmin && <button className="button button-secondary" type="button" onClick={() => startEdit(coach)}><Edit size={18} /> {t('edit', 'Edit')}</button>}
                    </div>
                  </>
                )}

                {isEditing && (
                  <form className="coach-edit-form" onSubmit={(event) => submitEdit(event, coach._id)}>
                    <label className="field"><span>{t('name', 'Name')}</span><input required value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} /></label>
                    <label className="field"><span>{t('title', 'Title')}</span><input value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} /></label>
                    <label className="field"><span>{t('email', 'Email')}</span><input value={draft.email} onChange={(e) => updateDraft('email', e.target.value)} /></label>
                    <label className="field"><span>{t('phone', 'Phone')}</span><input value={draft.phone} onChange={(e) => updateDraft('phone', e.target.value)} /></label>
                    <label className="field"><span>{t('birthday', 'Birthday')}</span><input type="date" value={draft.birthday} onChange={(e) => updateDraft('birthday', e.target.value)} /></label>
                    <label className="field"><span>{t('gender', 'Gender')}</span><input value={draft.gender} onChange={(e) => updateDraft('gender', e.target.value)} /></label>
                    <label className="field"><span>{t('yearsExperience', 'Years experience')}</span><input min="0" type="number" value={draft.yearsExperience} onChange={(e) => updateDraft('yearsExperience', e.target.value)} /></label>
                    <label className="field"><span>{t('photoUrl', 'Photo URL')}</span><input value={draft.photoUrl} onChange={(e) => updateDraft('photoUrl', e.target.value)} placeholder="https://..." /></label>
                    <label className="field">
                      <span>{t('uploadCoachPhoto', 'Upload coach photo')}</span>
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadCoachPhoto.mutate(file)
                      }} />
                    </label>
                    <label className="field coach-edit-wide"><span>{t('bio', 'Bio')}</span><textarea rows="3" value={draft.bio} onChange={(e) => updateDraft('bio', e.target.value)} /></label>
                    <label className="field coach-edit-wide"><span>{t('specialties', 'Specialties')}</span><input value={draft.specialties} onChange={(e) => updateDraft('specialties', e.target.value)} /></label>
                    <label className="field coach-edit-wide"><span>{t('certificates', 'Certificates')}</span><textarea rows="3" value={draft.certificates} onChange={(e) => updateDraft('certificates', e.target.value)} /></label>
                    <div className="form-actions coach-edit-wide">
                      <button className="button button-primary" disabled={updateCoach.isPending} type="submit"><Save size={18} /> {updateCoach.isPending ? t('saving', 'Saving...') : t('saveChanges', 'Save Changes')}</button>
                      <button className="button button-secondary" type="button" onClick={() => { setEditingId(''); setDraft(null); setEditError('') }}><X size={18} /> {t('cancel', 'Cancel')}</button>
                    </div>
                    {editError && <div className="alert alert-error coach-edit-wide">{editError}</div>}
                    {uploadCoachPhoto.isPending && <div className="alert alert-success coach-edit-wide">{t('uploadingCoachPhoto', 'Uploading coach photo...')}</div>}
                    {uploadCoachPhoto.isError && <div className="alert alert-error coach-edit-wide">{getApiErrorMessage(uploadCoachPhoto.error, t('couldNotUploadCoachPhoto', 'Could not upload coach photo'))}</div>}
                    {updateCoach.isError && <div className="alert alert-error coach-edit-wide">{getApiErrorMessage(updateCoach.error, t('couldNotSaveCoach', 'Could not save coach'))}</div>}
                  </form>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {!coaches.isLoading && (coaches.data?.data || []).length === 0 && (
        <div className="empty-state empty-state-action">
          <UserRound size={24} />
          <strong>{t('noCoachProfiles', 'No coach profiles yet.')}</strong>
          <span>{t('noCoachProfilesHint', 'Try another search or ask an admin to create a coach profile.')}</span>
        </div>
      )}
    </div>
  )
}
