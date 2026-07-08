import React, { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, MapPin, UserRound, UsersRound } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

export default function BookingSuccess() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t, language } = useTranslation()
  const [storedClassId] = useState(() => {
    const value = localStorage.getItem('lastBookingClassId')
    if (value) localStorage.removeItem('lastBookingClassId')
    return value
  })
  const stateClass = location.state?.classItem
  const classId = searchParams.get('classId') || stateClass?._id || storedClassId
  const { data, isError, error } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => api.get(`/classes/${classId}`).then((r) => r.data),
    enabled: Boolean(classId),
    placeholderData: stateClass
  })
  const klass = data || stateClass

  return (
    <div className="success-page">
      <section className="success-card page-card">
        <div className="success-icon"><CheckCircle2 size={42} /></div>
        <span className="eyebrow">{t('bookingConfirmed', language === 'en' ? 'Booking confirmed' : 'Đặt lớp đã xác nhận')}</span>
        <h1>{t('readyForCourt', language === 'en' ? 'You are ready for court' : 'Bạn đã sẵn sàng cho sân')}</h1>
        <p className="muted">{t('bookingSuccessDescription', language === 'en' ? 'Your class enrollment has been saved. You can review or cancel it from My Classes.' : 'Đăng ký lớp học của bạn đã được lưu. Bạn có thể xem hoặc hủy từ mục Lớp của tôi.')}</p>
        {isError && <div className="alert alert-error">{getApiErrorMessage(error, 'Could not refresh class details')}</div>}

        <div className="success-details">
          <div><UserRound size={20} /><span>{t('classes', 'Class')}</span><strong>{klass?.title || t('selectedClass', language === 'en' ? 'Selected class' : 'Lớp đã chọn')}</strong></div>
          <div><CalendarDays size={20} /><span>{t('start', 'Start')}</span><strong>{formatDateTime(klass?.startDate)}</strong></div>
          <div><MapPin size={20} /><span>{t('location', 'Location')}</span><strong>{klass?.location || t('classLocation', language === 'en' ? 'Class location' : 'Địa điểm lớp')}</strong></div>
          <div><UsersRound size={20} /><span>{t('coach', 'Coach')}</span><strong>{klass?.coachName || t('coach', 'Coach')}</strong></div>
        </div>

        <div className="form-actions success-actions">
          <Link className="button button-dark" to="/my/enrollments">{t('viewMyClasses', language === 'en' ? 'View My Classes' : 'Xem lớp của tôi')}</Link>
          <Link className="button button-secondary" to="/classes">{t('exploreMore', language === 'en' ? 'Explore More' : 'Khám phá thêm')}</Link>
        </div>
      </section>
    </div>
  )
}
