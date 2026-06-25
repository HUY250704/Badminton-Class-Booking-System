import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LogIn, Lock, Mail } from 'lucide-react'
import { login } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => navigate('/classes')
  })

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
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ email, password })
          }}
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
          {mutation.isError && <div className="alert alert-error">{mutation.error?.response?.data?.message || 'Login failed'}</div>}
          <p className="muted center">New player? <Link to="/register">Create an account</Link></p>
        </form>
      </section>
    </div>
  )
}
