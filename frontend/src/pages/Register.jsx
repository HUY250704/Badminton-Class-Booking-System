import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock, Mail, UserRound } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { register } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const mutation = useMutation({
    mutationFn: (data) => register(data),
    onSuccess: () => navigate('/classes')
  })

  function submit(e) {
    e.preventDefault()
    const nextName = name.trim()
    const nextEmail = email.trim().toLowerCase()
    setFormError('')

    if (!nextName || !nextEmail || !password) {
      setFormError(t('pleaseEnterNameEmailPassword', 'Please enter your name, email, and password.'))
      return
    }

    if (nextName.length < 2) {
      setFormError(t('nameTooShort', 'Name must be at least 2 characters.'))
      return
    }

    if (!isValidEmail(nextEmail)) {
      setFormError(t('invalidEmail', 'Please enter a valid email address.'))
      return
    }

    if (password.length < 6) {
      setFormError(t('passwordTooShort', 'Password must be at least 6 characters.'))
      return
    }

    mutation.mutate({ name: nextName, email: nextEmail, password })
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <img src="https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80" alt="Badminton player serving" />
          <div>
            <span className="eyebrow light">{t('startTraining', 'Start training')}</span>
            <h1>{t('joinLinBadminton', 'Join Lin-Badminton')}</h1>
            <p>{t('createAccountText', 'Create an account to book classes and track your sessions.')}</p>
          </div>
        </div>
        <form
          className="form-card"
          onSubmit={submit}
        >
          <div>
            <span className="eyebrow">{t('playerProfile', 'Player profile')}</span>
            <h2>{t('register', 'Register')}</h2>
          </div>
          <label className="field">
            <span>{t('name', 'Name')}</span>
            <div className="field-control"><UserRound size={18} /><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          </label>
          <label className="field">
            <span>{t('email', 'Email')}</span>
            <div className="field-control"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label className="field">
            <span>{t('password', 'Password')}</span>
            <div className="field-control"><Lock size={18} /><input required minLength="6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
          </label>
          <button className="button button-primary button-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? t('creatingAccount', 'Creating account...') : t('register', 'Register')}
          </button>
          {formError && <div className="alert alert-error">{formError}</div>}
          {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, 'Register failed')}</div>}
          <p className="muted center">{t('alreadyRegistered', 'Already registered?')} <Link to="/login">{t('login', 'Login')}</Link></p>
        </form>
      </section>
    </div>
  )
}
