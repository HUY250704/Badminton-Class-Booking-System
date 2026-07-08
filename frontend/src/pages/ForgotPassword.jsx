import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { forgotPassword } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const { t, language } = useTranslation()
  const mutation = useMutation({
    mutationFn: () => forgotPassword(email)
  })

  function submit(event) {
    event.preventDefault()
    mutation.mutate()
  }

  function devResetPath(resetUrl) {
    try {
      const url = new URL(resetUrl)
      return `${url.pathname}${url.search}`
    } catch {
      return resetUrl
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80" alt="Indoor badminton court" />
          <div>
            <span className="eyebrow light">{t('accountRecovery', language === 'en' ? 'Account recovery' : 'Khôi phục tài khoản')}</span>
            <h1>{t('resetPasswordTitle', language === 'en' ? 'Reset password' : 'Đặt lại mật khẩu')}</h1>
            <p>{t('resetPasswordDescription', language === 'en' ? 'Request a secure reset link and get back to your class schedule.' : 'Yêu cầu liên kết đặt lại an toàn và quay lại lịch học của bạn.')}</p>
          </div>
        </div>
        <form className="form-card" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t('forgotPasswordTitle', language === 'en' ? 'Forgot password' : 'Quên mật khẩu')}</span>
            <h2>{t('sendResetLink', language === 'en' ? 'Send Reset Link' : 'Gửi liên kết đặt lại')}</h2>
          </div>
          <label className="field">
            <span>{t('email', 'Email')}</span>
            <div className="field-control"><Mail size={18} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <button className="button button-primary button-full" disabled={mutation.isPending} type="submit">
            <Send size={18} /> {mutation.isPending ? t('sending', language === 'en' ? 'Sending...' : 'Đang gửi...') : t('sendLink', language === 'en' ? 'Send Link' : 'Gửi liên kết')}
          </button>
          {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, 'Could not send reset link')}</div>}
          {mutation.isSuccess && (
            <div className="alert alert-success">
              {mutation.data.message}
              {mutation.data.devResetUrl && <Link to={devResetPath(mutation.data.devResetUrl)}> {t('openDevResetLink', language === 'en' ? 'Open dev reset link' : 'Mở liên kết đặt lại dev')}</Link>}
            </div>
          )}
          <p className="muted center">{t('rememberedIt', language === 'en' ? 'Remembered it?' : 'Nhớ ra rồi?')} <Link to="/login">{t('login', 'Login')}</Link></p>
        </form>
      </section>
    </div>
  )
}
