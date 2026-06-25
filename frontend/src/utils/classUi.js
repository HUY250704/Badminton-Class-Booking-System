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

export function levelLabel(level) {
  return levelLabels[level] || level
}

export function classImage(level) {
  return levelImages[level] || levelImages.beginner
}

export function capacityPercent(currentStudents = 0, maxStudents = 1) {
  return Math.min(Math.round((currentStudents / Math.max(maxStudents, 1)) * 100), 100)
}

export function capacityText(currentStudents = 0, maxStudents = 1) {
  const remaining = Math.max(maxStudents - currentStudents, 0)
  if (remaining === 0) return 'Full'
  if (remaining <= 2) return 'Last few spots'
  return `${remaining} spots left`
}

export function formatDateTime(value) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(value) {
  if (!value) return 'TBD'
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function daysUntil(value) {
  if (!value) return 'Schedule pending'
  const start = new Date(value)
  const now = new Date()
  const diff = Math.ceil((start.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return 'Started'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff} days out`
}
