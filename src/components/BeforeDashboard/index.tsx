'use client'

import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to XZ Reality Capture OMS!</h4>
      </Banner>
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <a 
          href="/oms" 
          className="oms-button"
        >
          🚀 Go to Operations Management System
        </a>
      </div>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        The OMS is your main workspace for managing jobs, clients, technicians, and operations.
        This admin panel is for advanced configuration and data management.
      </p>
    </div>
  )
}

export default BeforeDashboard
