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
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '16px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0051cc'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0070f3'}
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
