import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { getUser, clearAuth } from '../hooks/useAuth'
import badmintonLogo from '../assets/logo.png'

export default function Header() {
  const user = getUser()
  const navigate = useNavigate()

  function logout() {
    clearAuth()
    navigate('/login')
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
        <NavLink to="/classes">Classes</NavLink>
        {user ? (
          <>
            <NavLink to="/my/enrollments">My Classes</NavLink>
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            <NavLink to="/profile" className="user-chip"><UserRound size={16} /> {user.name}</NavLink>
            <button className="icon-button" title="Logout" onClick={logout}><LogOut size={18} /></button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <Link className="button button-primary button-small" to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  )
}
