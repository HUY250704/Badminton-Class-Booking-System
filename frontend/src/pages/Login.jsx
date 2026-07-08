import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LogIn, Lock, Mail, Chrome } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { googleAuthUrl, login } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [authMessage, setAuthMessage] = useState(() => {
    const message = sessionStorage.getItem('authMessage') || ''
    sessionStorage.removeItem('authMessage')
    return message
  })
  const navigate = useNavigate()
  const { t } = useTranslation()

  const mutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => {
      sessionStorage.removeItem('authMessage')
      navigate('/classes')
    }
  })

  const googleLogin = useMutation({
    mutationFn: googleAuthUrl,
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    }
  })

  function submit(e) {
    e.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    setFormError('')
    setAuthMessage('')
    sessionStorage.removeItem('authMessage')

    if (!nextEmail || !password) {
      setFormError(t('pleaseEnterEmailPassword', 'Please enter both email and password.'))
      return
    }

    if (!isValidEmail(nextEmail)) {
      setFormError(t('invalidEmail', 'Please enter a valid email address.'))
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
            <span className="eyebrow light">{t('appName', 'Lin-Badminton')}</span>
            <h1>{t('welcomeBack', 'Welcome back')}</h1>
            <p>{t('welcomeMessage', 'Sign in and get your next court session moving.')}</p>
          </div>
        </div>
        <form
          className="form-card"
          onSubmit={submit}
        >
          <div>
            <span className="eyebrow">{t('memberAccess', 'Member access')}</span>
            <h2>{t('login', 'Login')}</h2>
          </div>
          <label className="field">
            <span>{t('email', 'Email')}</span>
            <div className="field-control"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label className="field">
            <span>{t('password', 'Password')}</span>
            <div className="field-control"><Lock size={18} /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /></div>
          </label>
          <button className="button button-primary button-full" disabled={mutation.isPending} type="submit">
            <LogIn size={18} /> {mutation.isPending ? t('signingIn', 'Signing in...') : t('login', 'Login')}
          </button>
          <button className="button button-secondary button-full" disabled={googleLogin.isPending} type="button" onClick={() => googleLogin.mutate()}>
            <Chrome size={18} /> {googleLogin.isPending ? t('openingGoogle', 'Opening Google...') : t('continueWithGoogle', 'Continue with Google')}
          </button>
          {authMessage && <div className="alert alert-error">{authMessage}</div>}
          {formError && <div className="alert alert-error">{formError}</div>}
          {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, 'Login failed')}</div>}
          {googleLogin.isError && <div className="alert alert-error">{getApiErrorMessage(googleLogin.error, 'Google OAuth is not configured yet')}</div>}
          <p className="muted center"><Link to="/forgot-password">{t('forgotPassword', 'Forgot password?')}</Link></p>
          <p className="muted center">{t('newPlayer', 'New player?')} <Link to="/register">{t('createAccount', 'Create an account')}</Link></p>
        </form>
      </section>
    </div>
  )
}
