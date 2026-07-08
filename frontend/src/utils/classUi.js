import { getLanguage } from './i18n'

export const levelLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
}

export const levelImages = {
  beginner: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  intermediate: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALzOheSMo5VDg7PGqYegbSfxAE1HzHj3ThS_a7NZeqG-pe3k5vyEHNHtVTBO6EVyFUGSR5eQPsGamL410MWSfbkLDVTzIRHfU3U5mkdiRLKshmz8zLCjZR-BY8Ybgois1Xs4gXx6XgyjcBGzwalCpHHFWNeMyfjGoBNA_aN7fN3d2CoJfBCsV3V3m6k9Q5QN7M8HmWB3ZGxGsoc9DyHRsOJxwROdEZ5I5Wb4ZmfDNJm3ucOF2fd3a3YIXxYN5dpXg8XYA01ZMJ5eI',
  advanced: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80'
}

const translatedLevelLabels = {
  vi: { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
}

function getLocale() {
  return getLanguage() === 'en' ? 'en-US' : 'vi-VN'
}

export function levelLabel(level) {
  return translatedLevelLabels[getLanguage()]?.[level] || levelLabels[level] || level
}

export function classImage(level) {
  return levelImages[level] || levelImages.beginner
}

export function capacityPercent(currentStudents = 0, maxStudents = 1) {
  return Math.min(Math.round((currentStudents / Math.max(maxStudents, 1)) * 100), 100)
}

export function capacityText(currentStudents = 0, maxStudents = 1) {
  const remaining = Math.max(maxStudents - currentStudents, 0)
  const language = getLanguage()
  if (remaining === 0) return language === 'en' ? 'Full' : 'Đã đầy'
  if (remaining <= 2) return language === 'en' ? 'Last few spots' : 'Chỉ còn vài chỗ'
  return language === 'en' ? `${remaining} spots left` : `Còn ${remaining} chỗ`
}

export function formatDateTime(value) {
  if (!value) return getLanguage() === 'en' ? 'Not scheduled' : 'Chưa lên lịch'
  return new Date(value).toLocaleString(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function formatDate(value) {
  if (!value) return getLanguage() === 'en' ? 'Not scheduled' : 'Chưa lên lịch'
  return new Date(value).toLocaleDateString(getLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(value) {
  if (!value) return 'TBD'
  return new Date(value).toLocaleTimeString(getLocale(), {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function daysUntil(value) {
  const language = getLanguage()
  if (!value) return language === 'en' ? 'Schedule pending' : 'Chờ lên lịch'
  const start = new Date(value)
  const now = new Date()
  const diff = Math.ceil((start.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return language === 'en' ? 'Started' : 'Đã bắt đầu'
  if (diff === 0) return language === 'en' ? 'Today' : 'Hôm nay'
  if (diff === 1) return language === 'en' ? 'Tomorrow' : 'Ngày mai'
  return language === 'en' ? `${diff} days out` : `Còn ${diff} ngày`
}
