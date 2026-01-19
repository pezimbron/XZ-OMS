# Resend Email Setup Guide

## Overview
Resend is now configured for transactional email notifications in XZ-OMS. This will handle all job notifications, alerts, and automated emails.

## Setup Steps

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (no credit card required)
3. Free tier includes:
   - 3,000 emails/month
   - 100 emails/day
   - Perfect for development and small-scale production

### 2. Get API Key
1. Log into Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Name it: `XZ-OMS Production` or `XZ-OMS Dev`
5. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables
Add these to your `.env` file:

```env
# Resend Email Service
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_DEFAULT_EMAIL=noreply@yourdomain.com
```

**Important:**
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- Replace `noreply@yourdomain.com` with your verified domain email
- For development, you can use any email, but for production you need to verify your domain

### 4. Domain Verification (Production Only)
For production emails to work properly:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `xzoms.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-15 minutes)

**For Development:**
- You can skip domain verification
- Resend will send emails from their domain
- Emails will still work but may go to spam

### 5. Test the Setup
After adding the environment variables:

1. Restart your dev server: `npm run dev`
2. Go to a job detail page
3. Click **Notify Client**
4. Select a template and send
5. Check the Resend dashboard for delivery status

### 6. Monitor Emails
- **Resend Dashboard**: View all sent emails, delivery status, opens, clicks
- **Logs**: Check console for any email errors
- **Warning Gone**: The "No email adapter" warning should disappear

## Email Types Configured
- Job scheduled notifications
- Job completion alerts  
- Upload ready notifications
- Workflow step completions
- QC completed notifications
- Deliverables ready alerts

## Troubleshooting

### Warning Still Appears
- Ensure `.env` file has the correct variables
- Restart the dev server completely
- Check that `RESEND_API_KEY` starts with `re_`

### Emails Not Sending
- Verify API key is correct in Resend dashboard
- Check Resend dashboard for error logs
- Ensure you haven't exceeded free tier limits (100/day)

### Emails Going to Spam
- Verify your domain in Resend
- Add SPF and DKIM records
- Use a professional from address (not gmail/yahoo)

## Production Checklist
- [ ] Domain verified in Resend
- [ ] DNS records added (SPF, DKIM, DMARC)
- [ ] Production API key created
- [ ] Environment variables set in Railway/hosting
- [ ] Test emails sent successfully
- [ ] Monitor delivery rates

## Cost
- **Free Tier**: 3,000 emails/month (sufficient for most small businesses)
- **Paid Plans**: Start at \/month for 50,000 emails
- **Current Usage**: Monitor in Resend dashboard

## Support
- Resend Docs: [resend.com/docs](https://resend.com/docs)
- Payload Email Docs: [payloadcms.com/docs/email/overview](https://payloadcms.com/docs/email/overview)
