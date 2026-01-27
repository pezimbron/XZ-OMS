# Scheduling Reminder Cron Setup

## Overview
The scheduling reminder system sends automated reminder emails to technicians who haven't responded to scheduling requests after 6 hours.

## How It Works

1. **Cron Job**: Runs every hour via Vercel Cron (configured in `vercel.json`)
2. **Endpoint**: `/api/scheduling/send-reminders`
3. **Logic**: 
   - Finds jobs with scheduling requests older than 6 hours
   - Filters for requests without tech responses
   - Sends reminder emails to techs
   - Marks reminders as sent to avoid duplicates

## Vercel Deployment

The cron job is automatically configured when deployed to Vercel via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/scheduling/send-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule**: `0 * * * *` = Every hour at minute 0

## Local Testing

To test the reminder system locally:

```bash
# Call the endpoint manually
curl http://localhost:3000/api/scheduling/send-reminders
```

## Security (Optional)

For production, you can add a secret token to prevent unauthorized access:

1. Add `CRON_SECRET` to your environment variables
2. The endpoint will check for `Authorization: Bearer <CRON_SECRET>` header
3. Vercel Cron automatically includes this header when configured

## Monitoring

Check logs for reminder activity:
- `[Scheduling Reminders] Found X jobs needing reminders`
- `[Scheduling Reminders] Sent reminder to <email> for job <jobId>`

## Alternative: Railway Cron

If deploying to Railway instead of Vercel, you can:

1. Use Railway's Cron Jobs feature
2. Or set up a simple external cron service (like cron-job.org) to call the endpoint
3. Make sure to set `CRON_SECRET` and include it in the Authorization header

## Database Fields

The reminder system uses these fields in the Jobs collection:

```typescript
schedulingRequest: {
  sentAt: Date              // When request was created
  reminderSent: boolean     // Whether reminder was sent
  reminderSentAt?: Date     // When reminder was sent
  deadline: Date            // Response deadline
}

techResponse: {
  respondedAt?: Date        // When tech responded (if they did)
}
```

## Email Template

The reminder email includes:
- Urgent warning styling (orange/amber gradient)
- Time remaining until deadline
- Job details
- Direct link to tech portal
- Call-to-action to respond or decline
