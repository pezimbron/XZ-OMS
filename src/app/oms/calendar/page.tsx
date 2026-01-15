import { JobsCalendarContent } from '@/components/oms/JobsCalendarContent'

export const metadata = {
  title: 'Calendar - XZ OMS',
}

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jobs Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visual schedule with color-coded regions</p>
        </div>
      </div>
      
      <JobsCalendarContent />
    </div>
  )
}
