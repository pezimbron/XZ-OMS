'use client'

import React from 'react'
import './index.scss'

const baseClass = 'unauthorized'

const Unauthorized: React.FC = () => {
  return (
    <div className={baseClass}>
      <div className={`${baseClass}__content`}>
        <h1>Access Restricted</h1>
        <p>You don't have permission to access the admin panel.</p>
        <p>The admin panel is for system administrators only.</p>
        <div className={`${baseClass}__actions`}>
          <a 
            href="/oms" 
            className={`${baseClass}__button ${baseClass}__button--primary`}
          >
            🏠 Go to Operations Dashboard
          </a>
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
