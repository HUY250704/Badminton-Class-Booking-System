import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useTranslation } from '../utils/i18n'

export default function NotFound() {
  const { t, language } = useTranslation()
  useEffect(() => {
    document.title = 'Page Not Found | Lin-Badminton'
  }, [])

  return (
    <div className="empty-state empty-state-action">
      <SearchX size={28} />
      <strong>{t('pageNotFound', language === 'en' ? 'Page not found' : 'Không tìm thấy trang')}</strong>
      <span>{t('pageNotFoundHint', language === 'en' ? 'The page you are looking for does not exist.' : 'Trang bạn đang tìm kiếm không tồn tại.')}</span>
      <Link className="button button-dark" to="/classes">{t('browseClasses', language === 'en' ? 'Browse Classes' : 'Duyệt lớp học')}</Link>
    </div>
  )
}
