'use client'

import { SaveIndicator } from '@/components/oms/SaveIndicator'

interface AutosaveField<T> {
  value: T
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
  setValue: (value: T) => void
  onBlur?: () => void
}

interface User {
  role: string
}

interface DeliverablesTabProps {
  job: any
  user: User
  deliverablesField: AutosaveField<any>
  editMode: boolean
  editedJob: any
  setEditedJob: (job: any) => void
}

export default function DeliverablesTab({
  job,
  user,
  deliverablesField,
  editMode,
  editedJob,
  setEditedJob,
}: DeliverablesTabProps) {
  const isTech = user?.role === 'tech'

  return (
    <div className="space-y-6">
      {/* Deliverables Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Client Deliverables & Assets</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Links to final deliverables. These will be accessible to clients in their portal.
        </p>

        <div className="space-y-4">
          {/* 3D Model Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🏢 3D Model Link
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.model3dLink ? (
                  <a
                    href={job.deliverables.model3dLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {job.deliverables.model3dLink}
                  </a>
                ) : (
                  <p className="text-gray-400 italic">No link provided</p>
                )}
              </div>
            ) : editMode ? (
              <input
                type="text"
                value={editedJob?.deliverables?.model3dLink || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, model3dLink: e.target.value }
                })}
                placeholder="https://my.matterport.com/show/?m=..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliverablesField.value?.model3dLink || ''}
                    onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, model3dLink: e.target.value })}
                    onBlur={() => deliverablesField.onBlur?.()}
                    placeholder="https://my.matterport.com/show/?m=..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.model3dLink}
                    onClick={() => window.open(deliverablesField.value?.model3dLink, '_blank', 'noopener,noreferrer')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Open link"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.model3dLink}
                    onClick={() => {
                      const v = deliverablesField.value?.model3dLink || ''
                      navigator.clipboard.writeText(v)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>

          {/* Floor Plans Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📐 Floor Plans Link
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.floorPlansLink ? (
                  <a
                    href={job.deliverables.floorPlansLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {job.deliverables.floorPlansLink}
                  </a>
                ) : (
                  <p className="text-gray-400 italic">No link provided</p>
                )}
              </div>
            ) : editMode ? (
              <input
                type="text"
                value={editedJob?.deliverables?.floorPlansLink || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, floorPlansLink: e.target.value }
                })}
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliverablesField.value?.floorPlansLink || ''}
                    onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, floorPlansLink: e.target.value })}
                    onBlur={() => deliverablesField.onBlur?.()}
                    placeholder="https://drive.google.com/... or https://dropbox.com/..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.floorPlansLink}
                    onClick={() => window.open(deliverablesField.value?.floorPlansLink, '_blank', 'noopener,noreferrer')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Open link"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.floorPlansLink}
                    onClick={() => {
                      const v = deliverablesField.value?.floorPlansLink || ''
                      navigator.clipboard.writeText(v)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>

          {/* As-Builts Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              � As-Built Files Link
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.asBuiltsLink ? (
                  <a
                    href={job.deliverables.asBuiltsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {job.deliverables.asBuiltsLink}
                  </a>
                ) : (
                  <p className="text-gray-400 italic">No link provided</p>
                )}
              </div>
            ) : editMode ? (
              <input
                type="text"
                value={editedJob?.deliverables?.asBuiltsLink || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, asBuiltsLink: e.target.value }
                })}
                placeholder="https://drive.google.com/... or https://dropbox.com/..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliverablesField.value?.asBuiltsLink || ''}
                    onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, asBuiltsLink: e.target.value })}
                    onBlur={() => deliverablesField.onBlur?.()}
                    placeholder="https://drive.google.com/... or https://dropbox.com/..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.asBuiltsLink}
                    onClick={() => window.open(deliverablesField.value?.asBuiltsLink, '_blank', 'noopener,noreferrer')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Open link"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.asBuiltsLink}
                    onClick={() => {
                      const v = deliverablesField.value?.asBuiltsLink || ''
                      navigator.clipboard.writeText(v)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>

          {/* Other Assets Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📦 Other Assets Link
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.otherAssetsLink ? (
                  <a
                    href={job.deliverables.otherAssetsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {job.deliverables.otherAssetsLink}
                  </a>
                ) : (
                  <p className="text-gray-400 italic">No link provided</p>
                )}
              </div>
            ) : editMode ? (
              <input
                type="text"
                value={editedJob?.deliverables?.otherAssetsLink || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, otherAssetsLink: e.target.value }
                })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliverablesField.value?.otherAssetsLink || ''}
                    onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, otherAssetsLink: e.target.value })}
                    onBlur={() => deliverablesField.onBlur?.()}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.otherAssetsLink}
                    onClick={() => window.open(deliverablesField.value?.otherAssetsLink, '_blank', 'noopener,noreferrer')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Open link"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={!deliverablesField.value?.otherAssetsLink}
                    onClick={() => {
                      const v = deliverablesField.value?.otherAssetsLink || ''
                      navigator.clipboard.writeText(v)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📝 Delivery Notes
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.deliveryNotes ? (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {job.deliverables.deliveryNotes}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">No notes</p>
                )}
              </div>
            ) : editMode ? (
              <textarea
                value={editedJob?.deliverables?.deliveryNotes || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, deliveryNotes: e.target.value }
                })}
                rows={3}
                placeholder="Internal notes about the deliverables..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <textarea
                  value={deliverablesField.value?.deliveryNotes || ''}
                  onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, deliveryNotes: e.target.value })}
                  onBlur={() => deliverablesField.onBlur?.()}
                  rows={3}
                  placeholder="Internal notes about the deliverables..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>

          {/* Delivered Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📅 Date Delivered
            </label>
            {isTech ? (
              <div>
                {job?.deliverables?.deliveredDate ? (
                  <p className="text-gray-900 dark:text-white">
                    {new Date(job.deliverables.deliveredDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">Not delivered yet</p>
                )}
              </div>
            ) : editMode ? (
              <input
                type="date"
                value={editedJob?.deliverables?.deliveredDate?.split('T')[0] || ''}
                onChange={(e) => setEditedJob({
                  ...editedJob,
                  deliverables: { ...editedJob?.deliverables, deliveredDate: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <div className="space-y-1">
                <input
                  type="date"
                  value={deliverablesField.value?.deliveredDate?.split?.('T')?.[0] || ''}
                  onChange={(e) => deliverablesField.setValue({ ...deliverablesField.value, deliveredDate: e.target.value })}
                  onBlur={() => deliverablesField.onBlur?.()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <SaveIndicator status={deliverablesField.status} error={deliverablesField.error} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
