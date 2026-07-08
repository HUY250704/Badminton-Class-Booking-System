import React, { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { getApiErrorMessage } from '../api/errors'
import { googleCallback } from '../hooks/useAuth'
import { useTranslation } from '../utils/i18n'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const code = searchParams.get('code') || ''

  const mutation = useMutation({
    mutationFn: () => googleCallback(code),
    onSuccess: () => navigate('/classes')
  })

  useEffect(() => {
    if (code) mutation.mutate()
  }, [code])

  return (
    <div className="auth-page">
      <section className="page-card success-card">
        <h1>{t('googleLogin', language === 'en' ? 'Google Login' : 'Đăng nhập bằng Google')}</h1>
        {!code && <div className="alert alert-error">{t('googleAuthMissing', language === 'en' ? 'Google did not return an authorization code.' : 'Google chưa trả về mã xác thực.')}</div>}
        {code && !mutation.isError && <p className="muted">{t('googleLoginPending', language === 'en' ? 'Signing you in with Google...' : 'Đang đăng nhập bằng Google...')}</p>}
        {mutation.isError && <div className="alert alert-error">{getApiErrorMessage(mutation.error, t('googleLoginFailed', 'Google login failed'))}</div>}
        {mutation.isError && <Link className="button button-secondary" to="/login">{t('backToLogin', language === 'en' ? 'Back to Login' : 'Quay lại đăng nhập')}</Link>}
      </section>
    </div>
  )
}
