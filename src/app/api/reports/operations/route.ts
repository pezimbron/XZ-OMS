import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.greater_than_equal = new Date(startDate).toISOString()
    }
    if (endDate) {
      dateFilter.less_than_equal = new Date(endDate).toISOString()
    }

    // Fetch jobs
    const where: any = {}
    if (startDate || endDate) {
      where.targetDate = dateFilter
    }

    const jobs = await payload.find({
      collection: 'jobs',
      where,
      limit: 10000,
      depth: 0,
    })

    // Initialize counters
    const jobsByStatus: Record<string, number> = {
      scheduled: 0,
      'in-progress': 0,
      done: 0,
      cancelled: 0,
      'pending-qc': 0,
      'qc-failed': 0,
    }

    const jobsByRegion: Record<string, number> = {}
    const jobsByMonth: Record<string, number> = {}

    let totalJobs = 0
    let assignedJobs = 0
    let unassignedJobs = 0

    // Process jobs
    for (const job of jobs.docs) {
      const j = job as any
      totalJobs += 1

      // Count by status
      const status = j.status || 'scheduled'
      jobsByStatus[status] = (jobsByStatus[status] || 0) + 1

      // Count by region
      const region = j.region || 'other'
      jobsByRegion[region] = (jobsByRegion[region] || 0) + 1

      // Count by month
      if (j.targetDate) {
        const date = new Date(j.targetDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        jobsByMonth[monthKey] = (jobsByMonth[monthKey] || 0) + 1
      }

      // Count assigned vs unassigned
      if (j.technician) {
        assignedJobs += 1
      } else {
        unassignedJobs += 1
      }
    }

    // Convert jobsByMonth to sorted array
    const jobsByMonthArray = Object.entries(jobsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate rates
    const completionRate = totalJobs > 0 ? jobsByStatus['done'] / totalJobs : 0
    const cancellationRate = totalJobs > 0 ? jobsByStatus['cancelled'] / totalJobs : 0
    const assignmentRate = totalJobs > 0 ? assignedJobs / totalJobs : 0

    return NextResponse.json({
      summary: {
        totalJobs,
        assignedJobs,
        unassignedJobs,
        completedJobs: jobsByStatus['done'] || 0,
        cancelledJobs: jobsByStatus['cancelled'] || 0,
        completionRate,
        cancellationRate,
        assignmentRate,
      },
      jobsByStatus,
      jobsByRegion,
      jobsByMonth: jobsByMonthArray,
    })
  } catch (error: any) {
    console.error('Operations report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate operations report', details: error.message },
      { status: 500 }
    )
  }
}
