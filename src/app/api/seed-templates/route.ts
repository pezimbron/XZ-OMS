import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { defaultNotificationTemplates } from '@/lib/seed-notification-templates'

export async function POST() {
  try {
    const payload = await getPayload({ config })

    // Check if templates already exist
    const existingTemplates = await payload.find({
      collection: 'notification-templates',
      limit: 1,
    })

    if (existingTemplates.docs.length > 0) {
      return NextResponse.json({ 
        message: 'Templates already exist. Delete existing templates first if you want to re-seed.' 
      })
    }

    // Create default templates
    for (const template of defaultNotificationTemplates) {
      await payload.create({
        collection: 'notification-templates',
        data: template,
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${defaultNotificationTemplates.length} default notification templates` 
    })
  } catch (error: any) {
    console.error('Error seeding templates:', error)
    return NextResponse.json({ 
      error: 'Failed to seed templates', 
      details: error.message 
    }, { status: 500 })
  }
}
