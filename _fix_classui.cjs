const fs = require("fs");

const content = `import { getLanguage } from './i18n'

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
  vi: { beginner: 'C\u01A1 b\u1EA3n', intermediate: 'Trung c\u1EA5p', advanced: 'N\u00E2ng cao' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
}

const sampleClassTranslations = {
  'Beginner Footwork Foundations': {
    vi: {
      title: 'N\u1EC1n t\u1EA3ng di chuy\u1EC3n c\u01A1 b\u1EA3n',
      description: 'H\u1ECDc c\xE1ch c\u1EA7m v\u1EE3t, t\u01B0 th\u1EBF, nh\u1ECBp split-step v\xE0 c\xE1c m\u1EABu di chuy\u1EC3n an to\xE0n cho nh\u1EEFng pha c\u1EA7u \u0111\u1EA7u ti\xEAn.',
      schedule: 'Th\u1EE9 Ba & Th\u1EE9 N\u0103m, 18:00 - 19:30',
      location: 'S\xE2n NAPA 1'
    },
    en: {
      title: 'Beginner Footwork Foundations',
      description: 'Learn grip, stance, split-step timing, and safe movement patterns for your first rallies.',
      schedule: 'Tue & Thu, 18:00 - 19:30',
      location: 'NAPA Court 1'
    }
  },
  'Intermediate Doubles Rotation': {
    vi: {
      title: 'Lu\xE2n chuy\u1EC3n \u0111\xF4i trung c\u1EA5p',
      description: 'R\xE8n \u0111\u1ED9i h\xECnh s\u1EAFc b\xE9n h\u01A1n, chuy\u1EC3n \u0111\u1ED5i tr\u01B0\u1EDBc-sau v\xE0 ph\xF2ng th\u1EE7 \xE1p l\u1EF1c cho \u0111\xE1nh \u0111\xF4i c\xE2u l\u1EA1c b\u1ED9.',
      schedule: 'Th\u1EE9 Hai & Th\u1EE9 T\u01B0, 19:30 - 21:00',
      location: 'S\xE2n NAPA 2'
    },
    en: {
      title: 'Intermediate Doubles Rotation',
      description: 'Build sharper formations, front-back transitions, and pressure defense for club doubles.',
      schedule: 'Mon & Wed, 19:30 - 21:00',
      location: 'NAPA Court 2'
    }
  },
  'Advanced Match Tempo': {
    vi: {
      title: 'Nh\u1ECBp \u0111\u1ED9 thi \u0111\u1EA5u n\xE2ng cao',
      description: 'B\xE0i t\u1EADp c\u01B0\u1EDDng \u0111\u1ED9 cao cho \u0111\xE1nh l\u1EEBa, t\u1ED1c \u0111\u1ED9 h\u1ED3i v\u1ECB, bi\u1EBFn h\xF3a giao c\u1EA7u v\xE0 ch\u1ECDn chi\u1EBFn thu\u1EADt c\xFA \u0111\xE1nh.',
      schedule: 'Th\u1EE9 B\u1EA3y, 08:00 - 10:00',
      location: 'Nh\xE0 thi \u0111\u1EA5u hi\u1EC7u su\u1EA5t NAPA'
    },
    en: {
      title: 'Advanced Match Tempo',
      description: 'High-intensity drills for deception, recovery speed, serve variation, and tactical shot selection.',
      schedule: 'Sat, 08:00 - 10:00',
      location: 'NAPA Performance Hall'
    }
  }
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

export function localizedClass(item = {}, language = getLanguage()) {
  const translated = sampleClassTranslations[item.title]?.[language]
  if (!translated) return item
  return { ...item, ...translated }
}

export function capacityPercent(currentStudents = 0, maxStudents = 1) {
  return Math.min(Math.round((currentStudents / Math.max(maxStudents, 1)) * 100), 100)
}

export function capacityText(currentStudents = 0, maxStudents = 1) {
  const remaining = Math.max(maxStudents - currentStudents, 0)
  const language = getLanguage()
  if (remaining === 0) return language === 'en' ? 'Full' : '\u0110\xE3 \u0111\u1EA7y'
  if (remaining <= 2) return language === 'en' ? 'Last few spots' : 'Ch\u1EC9 c\xF2n v\xE0i ch\u1ED7'
  return language === 'en' ? \x60${remaining} spots left\x60 : \x60C\xF2n ${remaining} ch\u1ED7\x60
}

export function formatDateTime(value) {
  if (!value) return getLanguage() === 'en' ? 'Not scheduled' : 'Ch\u01B0a l\xEAn l\u1ECBch'
  return new Date(value).toLocaleString(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function formatDate(value) {
  if (!value) return getLanguage() === 'en' ? 'Not scheduled' : 'Ch\u01B0a l\xEAn l\u1ECBch'
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
  if (!value) return language === 'en' ? 'Schedule pending' : 'Ch\u1EDD l\xEAn l\u1ECBch'
  const start = new Date(value)
  const now = new Date()
  const diff = Math.ceil((start.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return language === 'en' ? 'Started' : '\u0110\xE3 b\u1EAFt \u0111\u1EA7u'
  if (diff === 0) return language === 'en' ? 'Today' : 'H\xF4m nay'
  if (diff === 1) return language === 'en' ? 'Tomorrow' : 'Ng\xE0y mai'
  return language === 'en' ? \x60${diff} days out\x60 : \x60C\xF2n ${diff} ng\xE0y\x60
}
`;

fs.writeFileSync("frontend/src/utils/classUi.js", content, "utf8");
const vn = (content.match(/[\u1EA0-\u1EFF\u0100-\u01FF]/g) || []);
const repl = (content.match(/\uFFFD/g) || []);
console.log("VN chars:", vn.length, "Repl:", repl.length);
const lines = content.split("\n");
for (let i = 14; i < 18; i++) console.log("L" + (i+1) + ": " + lines[i].substring(0, 80));
