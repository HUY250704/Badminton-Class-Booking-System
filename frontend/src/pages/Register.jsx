import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock, Mail, UserRound } from 'lucide-react'
import { register } from '../hooks/useAuth'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (data) => register(data),
    onSuccess: () => navigate('/classes')
  })

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <img src="https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80" alt="Badminton player serving" />
          <div>
            <span className="eyebrow light">Start training</span>
            <h1>Join Lin-Badminton</h1>
            <p>Create an account to book classes and track your sessions.</p>
          </div>
        </div>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ name, email, password })
          }}
        >
          <div>
            <span className="eyebrow">Player profile</span>
            <h2>Register</h2>
          </div>
          <label className="field">
            <span>Name</span>
            <div className="field-control"><UserRound size={18} /><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          </label>
          <label className="field">
            <span>Email</span>
            <div className="field-control"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="field-control"><Lock size={18} /><input required minLength="6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
          </label>
          <button className="button button-primary button-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Creating account...' : 'Register'}
          </button>
          {mutation.isError && <div className="alert alert-error">{mutation.error?.response?.data?.message || 'Register failed'}</div>}
          <p className="muted center">Already registered? <Link to="/login">Login</Link></p>
        </form>
      </section>
    </div>
  )
}
