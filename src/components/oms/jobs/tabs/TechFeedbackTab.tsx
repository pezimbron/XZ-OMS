'use client'

interface Job {
  id: string
  tech?: {
    name: string
    email: string
    phone?: string
  }
  uploadLink?: string
  mediaUploadLink?: string
  workflowSteps?: any[]
}

interface User {
  role: string
}

interface TechFeedbackTabProps {
  job: Job
  user: User
}

export default function TechFeedbackTab({ job, user }: TechFeedbackTabProps) {
  return (
    <div className="space-y-6">
      {/* Tech Contact Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assigned Technician</h2>
        {job.tech ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
              <p className="text-gray-900 dark:text-white font-medium">{job.tech.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">
                <a href={`mailto:${job.tech.email}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  {job.tech.email}
                </a>
              </p>
            </div>
            {job.tech.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-gray-900 dark:text-white">
                  <a href={`tel:${job.tech.phone}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    {job.tech.phone}
                  </a>
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 italic">No technician assigned yet</p>
        )}
      </div>

      {/* Workflow Step Completion Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Workflow Completion Timeline</h2>

        {(() => {
          const techSteps = job.workflowSteps?.filter((step: any) =>
            step.completed &&
            step.completedBy &&
            step.completedBy !== 'system' &&
            !['Job Request', 'Job Scheduled'].includes(step.stepName)
          ) || []

          if (techSteps.length > 0) {
            return (
              <div className="space-y-3">
                {techSteps.map((step: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-green-500">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{step.stepName}</h3>
                        {step.completedAt && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(step.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {step.completedBy && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Completed by: {step.completedBy}
                        </p>
                      )}
                      {step.notes && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          {step.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          } else {
            return <p className="text-gray-400 italic">No workflow steps completed by technician yet</p>
          }
        })()}
      </div>

      {/* Upload Links */}
      {job.uploadLink || job.mediaUploadLink ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upload Links</h3>
          <div className="space-y-2">
            {job.uploadLink && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                  Primary Upload Link
                </label>
                <a
                  href={job.uploadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                >
                  {job.uploadLink}
                </a>
              </div>
            )}
            {job.mediaUploadLink && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                  Media Upload Link
                </label>
                <a
                  href={job.mediaUploadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                >
                  {job.mediaUploadLink}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
