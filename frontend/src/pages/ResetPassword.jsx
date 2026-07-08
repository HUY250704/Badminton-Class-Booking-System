import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { resetPassword } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const token = searchParams.get('token') || ''

  const mutation = useMutation({
    mutationFn: () => resetPassword(token, password),
    onSuccess: () => navigate('/classes')
  })

  function submit(event) {
    event.preventDefault()
    setFormError('')
    if (password.length < 6) {
      setFormError(t('passwordTooShortError', language === 'en' ? 'Password must be at least 6 characters.' : 'Mật khẩu phải có ít nhất 6 ký tự.'))
      return
    }
    if (password !== confirmPassword) {
      setFormError(t('passwordsDoNotMatch', language === 'en' ? 'Passwords do not match.' : 'Mật khẩu không khớp.'))
      return
    }
    mutation.mutate()
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <img src="https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80" alt="Badminton player serving" />
          <div>
            <span className="eyebrow light">{t('secureAccount', language === 'en' ? 'Secure account' : 'Tài khoản bảo mật')}</span>
            <h1>{t('chooseNewPassword', language === 'en' ? 'Choose a new password' : 'Chọn mật khẩu mới')}</h1>
            <p>{t('resetLinkExpires', language === 'en' ? 'Your reset link expires after one hour.' : 'Liên kết đặt lại của bạn hết hạn sau một giờ.')}</p>
          </div>
        </div>
        <form className="form-card" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t('passwordReset', language === 'en' ? 'Password reset' : 'Đặt lại mật khẩu')}</span>
            <h2>{t('newPassword', language === 'en' ? 'New Password' : 'Mật khẩu mới')}</h2>
          </div>
          {!token && <div className="alert alert-error">{t('resetTokenMissing', language === 'en' ? 'Reset token is missing. Request a new link.' : 'Thiếu mã thông báo đặt lại. Vui lòng yêu cầu liên kết mới.')}</div>}
          <label className="field">
            <span>{t('newPassword', language === 'en' ? 'New password' : 'Mật khẩu mới')}</span>
            <div className="field-control"><Lock size={18} /><input required minLength="6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
          </label>
          <label className="field">
            <span>{t('confirmPassword', language === 'en' ? 'Confirm password' : 'Xác nhận mật khẩu')}</span>
            <div className="field-control"><Lock size={18} /><input required minLength="6" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" /></div>
          </label>
          <button className="button button-primary button-full" disabled={!token || mutation.isPending} type="submit">
            {mutation.isPending ? t('saving', language === 'en' ? 'Saving...' : 'Đang lưu...') : t('resetPasswordAction', language === 'en' ? 'Reset Password' : 'Đặt lại mật khẩu')}
          </button>
          {formError && <div className="alert alert-error">{formError}</div>}
          {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, 'Could not reset password')}</div>}
          <p className="muted center"><Link to="/forgot-password">{t('requestAnotherLink', language === 'en' ? 'Request another link' : 'Yêu cầu liên kết khác')}</Link></p>
        </form>
      </section>
    </div>
  )
}
