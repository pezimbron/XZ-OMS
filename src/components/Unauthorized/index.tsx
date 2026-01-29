'use client'

import React from 'react'
import Link from 'next/link'
import './index.scss'

const baseClass = 'unauthorized'

const Unauthorized: React.FC = () => {
  return (
    <div className={baseClass}>
      <div className={`${baseClass}__content`}>
        <h1>Access Restricted</h1>
        <p>You don&apos;t have permission to access the admin panel.</p>
        <p>The admin panel is for system administrators only.</p>
        <div className={`${baseClass}__actions`}>
          <Link 
            href="/oms" 
            className={`${baseClass}__button ${baseClass}__button--primary`}
          >
            🏠 Go to Operations Dashboard
          </Link>
          <a 
            href="/api/users/logout" 
            className={`${baseClass}__button ${baseClass}__button--secondary`}
          >
            Log out
          </a>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
