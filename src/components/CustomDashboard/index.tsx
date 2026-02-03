'use client'

import React from 'react'
import { Gutter } from '@payloadcms/ui'

const CustomDashboard: React.FC = () => {
  return (
    <Gutter>
      <div style={{ padding: '2rem 0' }}>
        <h1>XZ Reality Capture OMS Admin</h1>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Welcome to the administrative dashboard. Use the navigation menu to manage your collections.
        </p>
        <div style={{ marginTop: '2rem' }}>
          <a 
            href="/oms" 
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#0070f3',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            🚀 Go to Operations Management System
          </a>
        </div>
      </div>
    </Gutter>
  )
}

export default CustomDashboard
