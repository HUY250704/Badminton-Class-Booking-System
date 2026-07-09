import React, { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { getUser, logout as logoutUser } from '../hooks/useAuth'
import badmintonLogo from '../assets/logo.png'
import { useTranslation } from '../utils/i18n'

export default function Header() {
  const user = getUser()
  const navigate = useNavigate()
  const { language, toggleLanguage, t } = useTranslation()
  const displayName = user?.role === 'admin' ? t('admin', 'Admin') : user?.name
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const storedTheme = window.localStorage.getItem('theme')
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  async function logout() {
    try {
      await logoutUser()
    } finally {
      navigate('/login')
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <img src={badmintonLogo} alt="" />
        </span>
        <span>Lin-Badminton</span>
      </Link>
      <nav className="nav-links">
        <NavLink to="/classes">{t('classes', 'Classes')}</NavLink>
        <NavLink to="/coaches">{t('coaches', 'Coaches')}</NavLink>
        {user ? (
          <>
            <NavLink to="/my/enrollments">{t('myClasses', 'My Classes')}</NavLink>
            <NavLink to="/payments">{t('payments', 'Payments')}</NavLink>
            {user.role === 'admin' && <NavLink to="/admin">{t('admin', 'Admin')}</NavLink>}
            <NavLink to="/profile" className="user-chip"><UserRound size={16} /> {displayName}</NavLink>
            <button className="icon-button" title={t('toggleLanguage', language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt')} onClick={toggleLanguage} aria-label={t('toggleLanguage', language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt')}>{language === 'vi' ? 'EN' : 'VI'}</button>
            <button className="icon-button" title={t('toggleTheme', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={toggleTheme} aria-label={t('toggleTheme', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" title={t('logout', 'Logout')} onClick={logout}><LogOut size={18} /></button>
          </>
        ) : (
          <>
            <button className="icon-button" title={t('toggleLanguage', language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt')} onClick={toggleLanguage} aria-label={t('toggleLanguage', language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt')}>{language === 'vi' ? 'EN' : 'VI'}</button>
            <button className="icon-button" title={t('toggleTheme', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={toggleTheme} aria-label={t('toggleTheme', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink to="/login">{t('login', 'Login')}</NavLink>
            <Link className="button button-primary button-small" to="/register">{t('register', 'Register')}</Link>
          </>
        )}
      </nav>
    </header>
  )
}
