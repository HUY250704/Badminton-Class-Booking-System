import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck2, ShieldCheck, Trophy, UsersRound } from 'lucide-react'
import { useTranslation } from '../utils/i18n'

const features = [
  { icon: CalendarCheck2, key: 'fastBooking', title: { vi: 'Đặt lớp nhanh', en: 'Fast class booking' }, text: { vi: 'Duyệt các buổi tập sắp tới, xem sức chứa và giữ chỗ ngay mà không cần gọi lễ tân.', en: 'Browse upcoming sessions, check capacity, and reserve your spot without calling the front desk.' } },
  { icon: Trophy, key: 'levelBased', title: { vi: 'Huấn luyện theo cấp độ', en: 'Level-based training' }, text: { vi: 'Lớp cơ bản, trung cấp và nâng cao được phân chia rõ ràng để người học tiến bộ tự tin.', en: 'Beginner, intermediate, and advanced classes are separated clearly so players can progress with confidence.' } },
  { icon: UsersRound, key: 'coachLed', title: { vi: 'Buổi học có huấn luyện viên', en: 'Coach-led sessions' }, text: { vi: 'Mỗi lớp đều có thông tin huấn luyện viên, lịch, địa điểm và tình trạng đăng ký trước khi học viên quyết định.', en: 'Every class includes coach, schedule, location, and enrollment details before students commit.' } }
]

export default function Landing() {
  const { language, t } = useTranslation()

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <img src="https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1800&q=80" alt="Badminton player smashing on court" />
        <div className="landing-overlay">
          <span className="eyebrow light">{t('appName', 'Lin-Badminton')}</span>
          <h1>{t('landingHeroTitle', language === 'en' ? 'Smash your limits' : 'Đập vỡ giới hạn của bạn')}</h1>
          <p>{t('landingHeroText', language === 'en' ? 'Book structured badminton classes, track your sessions, and keep every court workflow moving from one clean system.' : 'Đặt lịch học cầu lông có cấu trúc, theo dõi buổi tập và quản lý mọi hoạt động sân tập trong một hệ thống gọn gàng.')}</p>
          <div className="landing-actions">
            <Link className="button button-primary" to="/classes">{t('exploreClasses', language === 'en' ? 'Explore Classes' : 'Khám phá lớp học')} <ArrowRight size={18} /></Link>
            <Link className="button button-secondary landing-secondary" to="/register">{t('joinNow', language === 'en' ? 'Join Now' : 'Tham gia ngay')}</Link>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((item) => {
          const Icon = item.icon
          return (
            <article className="feature-card" key={item.key}>
              <span className="feature-icon"><Icon size={22} /></span>
              <h2>{item.title[language]}</h2>
              <p>{item.text[language]}</p>
            </article>
          )
        })}
      </section>

      <section className="page-card landing-band">
        <div>
          <span className="eyebrow">{t('adminReady', language === 'en' ? 'Admin ready' : 'Sẵn sàng cho quản trị')}</span>
          <h2>{t('adminReadyTitle', language === 'en' ? 'Manage classes and rosters in one place.' : 'Quản lý lớp học và danh sách học viên ở một nơi.')}</h2>
          <p className="muted">{t('adminReadyText', language === 'en' ? 'Admins can create sessions, monitor capacity, view enrolled students, and keep schedules accurate.' : 'Quản trị viên có thể tạo buổi học, theo dõi sức chứa, xem học viên đã đăng ký và giữ lịch trình luôn chính xác.')}</p>
        </div>
        <ShieldCheck size={48} />
      </section>
    </div>
  )
}
