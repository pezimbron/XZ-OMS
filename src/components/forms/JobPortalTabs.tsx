'use client'

import React, { useState } from 'react'

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

interface JobPortalTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  tabs: Tab[]
}

export default function JobPortalTabs({ activeTab, onTabChange, tabs }: JobPortalTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex -mb-px space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
