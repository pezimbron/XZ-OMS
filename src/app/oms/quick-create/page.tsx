import { QuickCreateJobContent } from '@/components/oms/QuickCreateJobContent'

export const metadata = {
  title: 'Quick Create Job - XZ OMS',
}

export default function QuickCreatePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quick Create Job</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered job creation from email</p>
        </div>
      </div>
      
      <QuickCreateJobContent />
    </div>
  )
}
