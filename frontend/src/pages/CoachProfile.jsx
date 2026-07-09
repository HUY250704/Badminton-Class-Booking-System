import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, CalendarDays, Mail, Phone, ShieldCheck, Sparkles, Trophy, UsersRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { classImage, formatDateTime, levelLabel } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

const fallbackCoachImage = 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80'

export default function CoachProfile() {
  const { id } = useParams()
  const { t } = useTranslation()

  const { data: coach, isLoading, isError, error } = useQuery({
    queryKey: ['coach', id],
    queryFn: () => api.get(`/coaches/${id}`).then((r) => r.data),
    enabled: Boolean(id)
  })

  if (isLoading) return <div className="page-card skeleton-card tall" />
  if (isError) return <div className="alert alert-error">{getApiErrorMessage(error, t('couldNotLoadCoach', 'Could not load coach profile'))}</div>
  if (!coach) return <div className="alert alert-error">{t('couldNotLoadCoach', 'Could not load coach profile')}</div>

  const specialties = coach.specialties || []
  const certificates = coach.certificates || []
  const teachingSchedule = coach.teachingSchedule || []

  return (
    <div className="stack">
      <Link className="button button-secondary button-fit" to="/coaches"><ArrowLeft size={18} /> {t('backToCoaches', 'Back to coaches')}</Link>

      <section className="coach-hero page-card">
        <div className="coach-photo">
          <img src={coach.photoUrl || fallbackCoachImage} alt={`${coach.name} coach portrait`} />
        </div>
        <div className="coach-summary">
          <span className="eyebrow">{t('coachProfile', 'Coach profile')}</span>
          <h1>{coach.name}</h1>
          <p>{coach.title || t('coachEntity', 'Coach')}</p>
          <div className="class-quick-row">
            {coach.email && <span><Mail size={16} /> {coach.email}</span>}
            {coach.phone && <span><Phone size={16} /> {coach.phone}</span>}
            {coach.yearsExperience > 0 && <span><Trophy size={16} /> {coach.yearsExperience} {t('yearsExperience', 'years experience')}</span>}
          </div>
        </div>
      </section>

      <div className="stats-grid coach-stats">
        <div className="stat-card">
          <span>{t('totalClasses', 'Total classes')}</span>
          <strong>{coach.classCount || 0}</strong>
        </div>
        <div className="stat-card">
          <span>{t('capacity', 'Capacity')}</span>
          <strong>{coach.totalStudents || 0}</strong>
        </div>
        <div className="stat-card">
          <span>{t('specialties', 'Specialties')}</span>
          <strong>{specialties.length}</strong>
        </div>
        <div className="stat-card">
          <span>{t('certificates', 'Certificates')}</span>
          <strong>{certificates.length}</strong>
        </div>
      </div>

      <div className="admin-split">
        <section className="page-card profile-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('bio', 'Bio')}</span>
            <h2>{t('aboutCoach', 'About coach')}</h2>
          </div>
          <p className="muted coach-bio">{coach.bio || t('noBioYet', 'No bio yet.')}</p>
          <div className="filter-pills">
            {specialties.map((item) => <span className="pill active" key={item}><Sparkles size={16} /> {item}</span>)}
            {specialties.length === 0 && <span className="muted">{t('noSpecialtiesListed', 'No specialties listed.')}</span>}
          </div>
        </section>

        <section className="page-card profile-panel">
          <div className="panel-header">
            <span className="eyebrow">{t('certificates', 'Certificates')}</span>
            <h2>{t('credentials', 'Credentials')}</h2>
          </div>
          <div className="compact-list">
            {certificates.map((item) => (
              <div className="compact-row" key={item}>
                <Award size={20} />
                <div><strong>{item}</strong><span>{t('verifiedCoachCredential', 'Coach credential')}</span></div>
              </div>
            ))}
            {certificates.length === 0 && (
              <div className="compact-row">
                <ShieldCheck size={20} />
                <div><strong>{t('noCertificatesListed', 'No certificates listed')}</strong><span>{t('adminCanUpdateCoachProfile', 'Admins can update this coach profile.')}</span></div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="page-card profile-panel">
        <div className="panel-header">
          <span className="eyebrow">{t('upcomingClasses', 'Upcoming classes')}</span>
          <h2>{t('teachingSchedule', 'Teaching schedule')}</h2>
        </div>
        <div className="card-grid">
          {teachingSchedule.map((item) => (
            <article className="class-card compact" key={item._id}>
              <div className="class-image">
                <img src={item.imageUrl || classImage(item.level)} alt={`${item.title} badminton class`} />
                <span className={`level-badge ${item.level}`}>{levelLabel(item.level)}</span>
              </div>
              <div className="class-body">
                <h2>{item.title}</h2>
                <div className="meta-list">
                  <span><CalendarDays size={18} /> {formatDateTime(item.startDate)}</span>
                  <span><UsersRound size={18} /> {item.maxStudents} {t('slots', 'slots')}</span>
                </div>
                <Link className="button button-dark" to={`/classes/${item._id}`}>{t('viewDetails', 'View details')}</Link>
              </div>
            </article>
          ))}
        </div>
        {teachingSchedule.length === 0 && <div className="empty-state">{t('noUpcomingTeachingSchedule', 'No upcoming teaching schedule.')}</div>}
      </section>
    </div>
  )
}
