import bcrypt from 'bcryptjs';

const now = Date.now();

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const adminId = 'user_admin';
const demoUserId = 'user_demo';

export const memory = {
  users: [
    {
      _id: adminId,
      name: 'NAPA Admin',
      email: 'admin@example.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'admin',
      tokenVersion: 0
    },
    {
      _id: demoUserId,
      name: 'Demo User',
      email: 'user@example.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'user',
      tokenVersion: 0
    }
  ],
  classes: [
    {
      _id: 'class_beginner',
      title: 'Beginner Footwork Foundations',
      description: 'Learn grip, stance, split-step timing, and safe movement patterns for your first rallies.',
      coachName: 'Coach Minh Tran',
      level: 'beginner',
      startDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      schedule: 'Tue & Thu, 18:00 - 19:30',
      location: 'NAPA Court 1',
      maxStudents: 12,
      price: 500000,
      coach: 'coach_minh',
      createdBy: adminId,
      updatedAt: new Date(now).toISOString()
    },
    {
      _id: 'class_intermediate',
      title: 'Intermediate Doubles Rotation',
      description: 'Build sharper formations, front-back transitions, and pressure defense for club doubles.',
      coachName: 'Coach Linh Nguyen',
      level: 'intermediate',
      startDate: new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString(),
      schedule: 'Mon & Wed, 19:30 - 21:00',
      location: 'NAPA Court 2',
      maxStudents: 10,
      price: 500000,
      coach: 'coach_linh',
      createdBy: adminId,
      updatedAt: new Date(now).toISOString()
    },
    {
      _id: 'class_advanced',
      title: 'Advanced Match Tempo',
      description: 'High-intensity drills for deception, recovery speed, serve variation, and tactical shot selection.',
      coachName: 'Coach An Pham',
      level: 'advanced',
      startDate: new Date(now + 18 * 24 * 60 * 60 * 1000).toISOString(),
      schedule: 'Sat, 08:00 - 10:00',
      location: 'NAPA Performance Hall',
      maxStudents: 8,
      price: 500000,
      coach: 'coach_an',
      createdBy: adminId,
      updatedAt: new Date(now).toISOString()
    }
  ],
  coaches: [
    {
      _id: 'coach_minh',
      name: 'Coach Minh Tran',
      email: 'minh@napa.test',
      bio: 'Footwork and beginner fundamentals specialist.',
      photoUrl: '',
      specialties: ['Footwork', 'Beginner'],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    },
    {
      _id: 'coach_linh',
      name: 'Coach Linh Nguyen',
      email: 'linh@napa.test',
      bio: 'Doubles rotation and tactical movement coach.',
      photoUrl: '',
      specialties: ['Doubles', 'Tactics'],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    },
    {
      _id: 'coach_an',
      name: 'Coach An Pham',
      email: 'an@napa.test',
      bio: 'Advanced match tempo and deception training.',
      photoUrl: '',
      specialties: ['Advanced', 'Match play'],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    }
  ],
  enrollments: [],
  bookmarks: [],
  waitlist: [],
  attendance: [],
  payments: []
};

export function newId(prefix) {
  return id(prefix);
}
