import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, Image, Lock, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { changePassword, getUser, updateProfile } from '../hooks/useAuth'

export default function Profile() {
  const user = getUser()
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || ''
  })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const isStudent = user?.role !== 'admin'
  const displayName = user?.role === 'admin' ? 'Admin' : user?.name
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'User'
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
          <h1>{profile.name || displayName || 'Lin-Badminton Member'}</h1>
          <p><Mail size={18} /> {user?.email || 'No email available'}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Role</span><strong>{roleLabel}</strong></div>
        <div className="stat-card"><span>Booked</span><strong>{isStudent ? activeEnrollments.length : 'Admin'}</strong></div>
        <div className="stat-card"><span>Upcoming</span><strong>{isStudent ? upcomingCount : 'All'}</strong></div>
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">Account</span>
          <h2>Quick Actions</h2>
        </div>
        <div className="profile-actions">
          {user?.role === 'admin' ? (
            <Link className="button button-dark" to="/admin"><ShieldCheck size={18} /> Open Admin Portal</Link>
          ) : (
            <Link className="button button-dark" to="/my/enrollments"><CalendarDays size={18} /> View My Classes</Link>
          )}
          <Link className="button button-secondary" to="/classes">Explore Classes</Link>
        </div>
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">Profile</span>
          <h2>Edit Personal Info</h2>
        </div>
        <form className="profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate() }}>
          <label className="field">
            <span>Name</span>
            <div className="field-control"><UserRound size={18} /><input value={profile.name} onChange={(e) => setProfile((draft) => ({ ...draft, name: e.target.value }))} /></div>
          </label>
          <label className="field">
            <span>Phone</span>
            <div className="field-control"><Phone size={18} /><input value={profile.phone} onChange={(e) => setProfile((draft) => ({ ...draft, phone: e.target.value }))} placeholder="Optional" /></div>
          </label>
          <label className="field profile-wide">
            <span>Avatar URL</span>
            <div className="field-control"><Image size={18} /><input value={profile.avatarUrl} onChange={(e) => setProfile((draft) => ({ ...draft, avatarUrl: e.target.value }))} placeholder="https://..." /></div>
          </label>
          <label className="field profile-wide">
            <span>Upload avatar</span>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAvatar.mutate(file)
            }} />
          </label>
          <button className="button button-primary" disabled={saveProfile.isPending} type="submit">{saveProfile.isPending ? 'Saving...' : 'Save Profile'}</button>
        </form>
        {uploadAvatar.isPending && <div className="alert alert-success">Uploading avatar...</div>}
        {uploadAvatar.isError && <div className="alert alert-error">{getApiErrorMessage(uploadAvatar.error, 'Could not upload avatar')}</div>}
        {saveProfile.isError && <div className="alert alert-error">{getApiErrorMessage(saveProfile.error, 'Could not save profile')}</div>}
        {saveProfile.isSuccess && <div className="alert alert-success">Profile updated.</div>}
      </section>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">Security</span>
          <h2>Change Password</h2>
        </div>
        <form className="profile-form" onSubmit={(event) => { event.preventDefault(); savePassword.mutate() }}>
          <label className="field">
            <span>Current password</span>
            <div className="field-control"><Lock size={18} /><input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((draft) => ({ ...draft, currentPassword: e.target.value }))} /></div>
          </label>
          <label className="field">
            <span>New password</span>
            <div className="field-control"><Lock size={18} /><input minLength="6" type="password" value={passwords.newPassword} onChange={(e) => setPasswords((draft) => ({ ...draft, newPassword: e.target.value }))} /></div>
          </label>
          <button className="button button-primary" disabled={savePassword.isPending || passwords.newPassword.length < 6} type="submit">{savePassword.isPending ? 'Saving...' : 'Change Password'}</button>
        </form>
        {savePassword.isError && <div className="alert alert-error">{getApiErrorMessage(savePassword.error, 'Could not change password')}</div>}
        {savePassword.isSuccess && <div className="alert alert-success">Password changed. Your session was refreshed.</div>}
      </section>
    </div>
  )
}
