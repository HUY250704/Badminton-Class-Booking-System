import React from 'react'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="empty-state empty-state-action">
      <SearchX size={28} />
      <strong>Page not found</strong>
      <span>The page you are looking for does not exist.</span>
      <Link className="button button-dark" to="/classes">Browse Classes</Link>
    </div>
  )
}
