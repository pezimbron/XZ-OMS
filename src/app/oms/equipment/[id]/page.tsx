'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Equipment {
  id: string
  name: string
  type?: string
  serialNumber?: string
  status?: string
  assignedTo?: {
    id: string
    name: string
  }
  purchaseDate?: string
  lastMaintenance?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export default function EquipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchEquipment(params.id as string)
    }
  }, [params.id])

  const fetchEquipment = async (id: string) => {
    try {
      const response = await fetch(`/api/equipment/${id}?depth=1`)
      const data = await response.json()
      setEquipment(data)
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading equipment...</p>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Equipment Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The equipment you're looking for doesn't exist.</p>
          <Link href="/oms/equipment" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Equipment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/oms/equipment"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
            >
              ← Back to Equipment
            </Link>
            <button
              onClick={() => router.push(`/admin/collections/equipment/${equipment.id}`)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Edit in Admin
            </button>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🎥</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {equipment.name}
                </h1>
                {equipment.status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    equipment.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    equipment.status === 'in-use' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {equipment.status}
                  </span>
                )}
              </div>
              {equipment.type && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {equipment.type}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Equipment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Equipment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {equipment.serialNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</label>
                  <p className="text-gray-900 dark:text-white font-mono">{equipment.serialNumber}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-gray-900 dark:text-white capitalize">{equipment.status || 'Unknown'}</p>
              </div>
              {equipment.type && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</label>
                  <p className="text-gray-900 dark:text-white">{equipment.type}</p>
                </div>
              )}
              {equipment.purchaseDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(equipment.purchaseDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assignment</h2>
            {equipment.assignedTo ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Currently assigned to:</p>
                <Link
                  href={`/oms/technicians/${equipment.assignedTo.id}`}
                  className="text-lg font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {equipment.assignedTo.name}
                </Link>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Not currently assigned</p>
            )}
          </div>

          {/* Maintenance */}
          {equipment.lastMaintenance && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Maintenance</h2>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Maintenance</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(equipment.lastMaintenance).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {equipment.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notes</h2>
              <pre className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">
                {equipment.notes}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
