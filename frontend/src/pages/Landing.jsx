import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck2, ShieldCheck, Trophy, UsersRound } from 'lucide-react'

const features = [
  { icon: CalendarCheck2, title: 'Fast class booking', text: 'Browse upcoming sessions, check capacity, and reserve your spot without calling the front desk.' },
  { icon: Trophy, title: 'Level-based training', text: 'Beginner, intermediate, and advanced classes are separated clearly so players can progress with confidence.' },
  { icon: UsersRound, title: 'Coach-led sessions', text: 'Every class includes coach, schedule, location, and enrollment details before students commit.' }
]

export default function Landing() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <img src="https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1800&q=80" alt="Badminton player smashing on court" />
        <div className="landing-overlay">
          <span className="eyebrow light">Lin-Badminton</span>
          <h1>Smash your limits</h1>
          <p>Book structured badminton classes, track your sessions, and keep every court workflow moving from one clean system.</p>
          <div className="landing-actions">
            <Link className="button button-primary" to="/classes">Explore Classes <ArrowRight size={18} /></Link>
            <Link className="button button-secondary landing-secondary" to="/register">Join Now</Link>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((item) => {
          const Icon = item.icon
          return (
            <article className="feature-card" key={item.title}>
              <span className="feature-icon"><Icon size={22} /></span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          )
        })}
      </section>

      <section className="page-card landing-band">
        <div>
          <span className="eyebrow">Admin ready</span>
          <h2>Manage classes and rosters in one place.</h2>
          <p className="muted">Admins can create sessions, monitor capacity, view enrolled students, and keep schedules accurate.</p>
        </div>
        <ShieldCheck size={48} />
      </section>
    </div>
  )
}
