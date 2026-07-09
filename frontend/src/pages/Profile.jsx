import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, Image, Lock, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { changePassword, getUser, updateProfile } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

export default function Profile() {
  const user = getUser()
  const { t } = useTranslation()
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || ''
  })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const isStudent = user?.role !== 'admin'
  const displayName = user?.role === 'admin' ? t('admin') : user?.name
  const roleLabel = user?.role === 'admin' ? t('admin') : t('user')
  const { data = [] } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/classes/my/enrollments').then((r) => r.data),
    enabled: isStudent
  })

  const activeEnrollments = data.filter((item) => item.class)
  const upcomingCount = activeEnrollments.filter((item) => new Date(item.class.startDate) >= new Date()).length
  const saveProfile = useMutation({
    mutationFn: () => updateProfile(profile),
    onSuccess: (nextUser) => setProfile({
      name: nextUser.name || '',
      phone: nextUser.phone || '',
      avatarUrl: nextUser.avatarUrl || ''
    })
  })
  const savePassword = useMutation({
    mutationFn: () => changePassword(passwords.currentPassword, passwords.newPassword),
    onSuccess: () => setPasswords({ currentPassword: '', newPassword: '' })
  })
  const uploadAvatar = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'avatars')
      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: (result) => setProfile((draft) => ({ ...draft, avatarUrl: result.url }))
  })

  return (
    <div className="profile-layout">
      <section className="profile-hero page-card">
        <div className="profile-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <UserRound size={42} />}
        </div>
        <div>
          <span className="eyebrow">{roleLabel}</span>
          <h1>{profile.name || displayName || t('linBadmintonMember')}</h1>
          <p><Mail size={18} /> {user?.email || t('noEmailAvailable')}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>{t('role')}</span><strong>{roleLabel}</strong></div>
        <div className="stat-card"><span>{t('booked')}</span><strong>{isStudent ? activeEnrollments.length : t('admin')}</strong></div>
        <div className="stat-card"><span>{t('upcoming')}</span><strong>{isStudent ? upcomingCount : t('all')}</strong></div>
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('account')}</span>
          <h2>{t('quickActions')}</h2>
        </div>
        <div className="profile-actions">
          {user?.role === 'admin' ? (
            <Link className="button button-dark" to="/admin"><ShieldCheck size={18} /> {t('openAdminPortal')}</Link>
          ) : (
            <Link className="button button-dark" to="/my/enrollments"><CalendarDays size={18} /> {t('viewMyClasses')}</Link>
          )}
          <Link className="button button-secondary" to="/classes">{t('exploreClasses')}</Link>
        </div>
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('profileTitle')}</span>
          <h2>{t('editPersonalInfo')}</h2>
        </div>
        <form className="profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate() }}>
          <label className="field">
            <span>{t('name')}</span>
            <div className="field-control"><UserRound size={18} /><input value={profile.name} onChange={(e) => setProfile((draft) => ({ ...draft, name: e.target.value }))} /></div>
          </label>
          <label className="field">
            <span>{t('phone')}</span>
            <div className="field-control"><Phone size={18} /><input value={profile.phone} onChange={(e) => setProfile((draft) => ({ ...draft, phone: e.target.value }))} placeholder={t('optional')} /></div>
          </label>
          <label className="field profile-wide">
            <span>{t('avatarUrl')}</span>
            <div className="field-control"><Image size={18} /><input value={profile.avatarUrl} onChange={(e) => setProfile((draft) => ({ ...draft, avatarUrl: e.target.value }))} placeholder="https://..." /></div>
          </label>
          <label className="field profile-wide">
            <span>{t('uploadAvatar')}</span>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAvatar.mutate(file)
            }} />
          </label>
          <button className="button button-primary" disabled={saveProfile.isPending} type="submit">{saveProfile.isPending ? t('saving') : t('saveProfile')}</button>
        </form>
        {uploadAvatar.isPending && <div className="alert alert-success">{t('uploadAvatarPending')}</div>}
        {uploadAvatar.isError && <div className="alert alert-error">{getApiErrorMessage(uploadAvatar.error, t('couldNotUploadAvatar'))}</div>}
        {saveProfile.isError && <div className="alert alert-error">{getApiErrorMessage(saveProfile.error, t('couldNotSaveProfile'))}</div>}
        {saveProfile.isSuccess && <div className="alert alert-success">{t('profileUpdated')}</div>}
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('security')}</span>
          <h2>{t('changePassword')}</h2>
        </div>
        <form className="profile-form" onSubmit={(event) => { event.preventDefault(); savePassword.mutate() }}>
          <label className="field">
            <span>{t('currentPassword')}</span>
            <div className="field-control"><Lock size={18} /><input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((draft) => ({ ...draft, currentPassword: e.target.value }))} /></div>
          </label>
          <label className="field">
            <span>{t('newPassword')}</span>
            <div className="field-control"><Lock size={18} /><input minLength="6" type="password" value={passwords.newPassword} onChange={(e) => setPasswords((draft) => ({ ...draft, newPassword: e.target.value }))} /></div>
          </label>
          <button className="button button-primary" disabled={savePassword.isPending || passwords.newPassword.length < 6} type="submit">{savePassword.isPending ? t('saving') : t('changePassword')}</button>
        </form>
        {savePassword.isError && <div className="alert alert-error">{getApiErrorMessage(savePassword.error, t('couldNotChangePassword'))}</div>}
        {savePassword.isSuccess && <div className="alert alert-success">{t('passwordChanged')}</div>}
      </section>
    </div>
  )
}
