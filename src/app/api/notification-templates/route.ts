import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Fetch all active notification templates
    const templates = await payload.find({
      collection: 'notification-templates',
      where: {
        active: { equals: true },
      },
      sort: 'type',
      limit: 100,
    })

    // Format templates for the dropdown
    const formattedTemplates = templates.docs.map((template) => ({
      value: template.type,
      label: template.name,
      type: template.type,
      subject: template.subject,
      body: template.body,
    }))

    return NextResponse.json({ templates: formattedTemplates })
  } catch (error: any) {
    console.error('Error fetching notification templates:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch notification templates', 
      details: error.message 
    }, { status: 500 })
  }
}
