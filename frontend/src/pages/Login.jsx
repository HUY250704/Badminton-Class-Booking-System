import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LogIn, Lock, Mail } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { login } from '../hooks/useAuth'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [authMessage, setAuthMessage] = useState(() => sessionStorage.getItem('authMessage') || '')
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => {
      sessionStorage.removeItem('authMessage')
      navigate('/classes')
    }
  })

  function submit(e) {
    e.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    setFormError('')
    setAuthMessage('')
    sessionStorage.removeItem('authMessage')

    if (!nextEmail || !password) {
      setFormError('Please enter both email and password.')
      return
    }

    if (!isValidEmail(nextEmail)) {
      setFormError('Please enter a valid email address.')
      return
    }

    mutation.mutate({ email: nextEmail, password })
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80" alt="Indoor badminton court" />
          <div>
            <span className="eyebrow light">Lin-Badminton</span>
            <h1>Welcome back</h1>
            <p>Sign in and get your next court session moving.</p>
          </div>
        </div>
        <form
          className="form-card"
          onSubmit={submit}
        >
          <div>
            <span className="eyebrow">Member access</span>
            <h2>Login</h2>
          </div>
          <label className="field">
            <span>Email</span>
            <div className="field-control"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="field-control"><Lock size={18} /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /></div>
          </label>
          <button className="button button-primary button-full" disabled={mutation.isPending} type="submit">
            <LogIn size={18} /> {mutation.isPending ? 'Signing in...' : 'Login'}
          </button>
          {authMessage && <div className="alert alert-error">{authMessage}</div>}
          {formError && <div className="alert alert-error">{formError}</div>}
          {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, 'Login failed')}</div>}
          <p className="muted center">New player? <Link to="/register">Create an account</Link></p>
        </form>
      </section>
    </div>
  )
}
