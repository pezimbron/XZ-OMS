// Default notification templates
export const defaultNotificationTemplates: Array<{
  name: string
  type: 'scheduled' | 'completed' | 'delivered'
  active: boolean
  defaultTemplate: boolean
  subject: string
  body: string
}> = [
  {
    name: 'Default Job Scheduled',
    type: 'scheduled',
    active: true,
    defaultTemplate: true,
    subject: 'Job #{{jobNumber}} - Scheduled for {{clientName}}',
    body: `Hello {{clientName}},

Your job has been scheduled:

Job Number: {{jobNumber}}
Location: {{location}}
Scheduled Date: {{targetDate}}

{{clientCustomMessage}}

{{customMessage}}

If you have any questions, please don't hesitate to reach out.

Thank you for choosing XZ Operations!

Best regards,
XZ Operations Team`,
  },
  {
    name: 'Default Job Completed',
    type: 'completed',
    active: true,
    defaultTemplate: true,
    subject: 'Job #{{jobNumber}} - Completed',
    body: `Hello {{clientName}},

Great news! Your job has been completed:

Job Number: {{jobNumber}}
Location: {{location}}
Completed Date: {{scannedDate}}

{{clientCustomMessage}}

{{customMessage}}

We'll notify you as soon as your deliverables are ready for download.

Thank you for choosing XZ Operations!

Best regards,
XZ Operations Team`,
  },
  {
    name: 'Default Deliverables Ready',
    type: 'delivered',
    active: true,
    defaultTemplate: true,
    subject: 'Job #{{jobNumber}} - Deliverables Ready',
    body: `Hello {{clientName}},

Your deliverables are now ready for download:

Job Number: {{jobNumber}}
Location: {{location}}
Download Link: {{uploadLink}}

{{clientCustomMessage}}

{{customMessage}}

Please download your files at your earliest convenience. If you have any issues accessing the files, please let us know.

Thank you for choosing XZ Operations!

Best regards,
XZ Operations Team`,
  },
]
