import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface TechPerformance {
  techId: string
  name: string
  email: string
  type: string
  jobsCompleted: number
  totalEarnings: number
  averageEarnings: number
  regionsServed: string[]
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const techId = searchParams.get('techId')

    // Build where clause for jobs
    const where: any = {
      status: { equals: 'done' },
    }

    // Date filter on targetDate
    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) {
        dateFilter.greater_than_equal = new Date(startDate).toISOString()
      }
      if (endDate) {
        dateFilter.less_than_equal = new Date(endDate).toISOString()
      }
      where.targetDate = dateFilter
    }

    if (techId) {
      where.technician = { equals: techId }
    }

    // Fetch completed jobs
    const jobs = await payload.find({
      collection: 'jobs',
      where,
      limit: 10000,
      depth: 1,
    })

    // Aggregate by technician
    const techMap = new Map<string, TechPerformance>()

    for (const job of jobs.docs) {
      const j = job as any
      const tech = j.technician

      if (!tech) continue

      const tId = typeof tech === 'object' ? tech?.id : tech
      const tName = typeof tech === 'object' ? tech?.name : 'Unknown'
      const tEmail = typeof tech === 'object' ? tech?.email : ''
      const tType = typeof tech === 'object' ? tech?.type : ''

      if (!tId) continue

      const earnings =
        (j.vendorPrice || 0) + (j.travelPayout || 0) + (j.offHoursPayout || 0)
      const region = j.region || 'other'

      if (!techMap.has(String(tId))) {
        techMap.set(String(tId), {
          techId: String(tId),
          name: tName || 'Unknown',
          email: tEmail || '',
          type: tType || '',
          jobsCompleted: 0,
          totalEarnings: 0,
          averageEarnings: 0,
          regionsServed: [],
        })
      }

      const techData = techMap.get(String(tId))!
      techData.jobsCompleted += 1
      techData.totalEarnings += earnings

      if (!techData.regionsServed.includes(region)) {
        techData.regionsServed.push(region)
      }
    }

    // Calculate averages and sort by jobs completed
    const techs = Array.from(techMap.values())
      .map((t) => ({
        ...t,
        averageEarnings:
          t.jobsCompleted > 0 ? t.totalEarnings / t.jobsCompleted : 0,
      }))
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted)

    // Calculate totals
    const totalJobs = techs.reduce((sum, t) => sum + t.jobsCompleted, 0)
    const totalEarnings = techs.reduce((sum, t) => sum + t.totalEarnings, 0)

    return NextResponse.json({
      summary: {
        totalTechs: techs.length,
        totalJobs,
        totalEarnings,
        averageJobsPerTech: techs.length > 0 ? totalJobs / techs.length : 0,
      },
      techs,
    })
  } catch (error: any) {
    console.error('Tech performance report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tech performance report', details: error.message },
      { status: 500 }
    )
  }
}
