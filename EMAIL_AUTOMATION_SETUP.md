# Email-to-Job Automation Setup Guide

This guide will help you set up automatic job creation from forwarded emails using Gemini AI.

## How It Works

1. You receive a job request email (e.g., from Matterport)
2. Forward it to a dedicated email address
3. Email service (SendGrid/Mailgun) forwards to your OMS API
4. Gemini AI parses the email and extracts job details
5. Job is automatically created in the OMS
6. Calendar invite is sent to assigned tech (if specified)
7. You receive a confirmation email

## Prerequisites

- Gemini API key (Google AI Studio)
- Email forwarding service (SendGrid, Mailgun, or similar)
- Your OMS deployed and accessible via HTTPS

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key
4. Add to your `.env`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

## Step 2: Choose Email Forwarding Service

### Option A: SendGrid (Recommended - Free tier available)

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Go to Settings → Inbound Parse
3. Click "Add Host & URL"
4. Set:
   - Hostname: `jobs.your-domain.com` (or use SendGrid subdomain)
   - URL: `https://your-oms-domain.com/api/parse-job-email`
   - Check "POST the raw, full MIME message"
5. Save

### Option B: Mailgun

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Go to Receiving → Routes
3. Create route:
   - Expression Type: Match Recipient
   - Recipient: `jobs@your-domain.com`
   - Actions: Forward to URL
   - URL: `https://your-oms-domain.com/api/parse-job-email`

### Option C: Manual Testing (No email service needed)

Use this for testing without setting up email forwarding:

```bash
curl -X POST https://your-oms-domain.com/api/parse-job-email \
  -H "Content-Type: application/json" \
  -d '{
    "emailContent": "Your job on 01/06/2026 1:00 PM is confirmed. Client Company: Spencer Technologies..."
  }'
```

## Step 3: Configure Email Forwarding

### Gmail (for testing)

1. Go to Gmail Settings → Forwarding and POP/IMAP
2. Add forwarding address: `jobs@your-sendgrid-domain.com`
3. Confirm the forwarding address
4. Create a filter:
   - From: `@matterport.com` OR subject contains "Appointment Confirmation"
   - Action: Forward to `jobs@your-sendgrid-domain.com`

### Outlook

1. Go to Settings → Mail → Forwarding
2. Enable forwarding to `jobs@your-sendgrid-domain.com`
3. Create a rule to forward specific emails

## Step 4: Test the Integration

### Test with Matterport Email

1. Forward a Matterport appointment confirmation to your jobs email
2. Check your OMS admin panel → Jobs collection
3. Verify the job was created with:
   - ✅ Client = "Matterport"
   - ✅ End Client Name = "Spencer Technologies (4)"
   - ✅ End Client Company = "Spencer Technologies"
   - ✅ All address fields populated
   - ✅ POC information filled
   - ✅ Date/time set correctly
   - ✅ Financial data (vendorPrice, travelPayout, etc.)

### Manual Test (No email needed)

```bash
curl -X POST http://localhost:3000/api/parse-job-email \
  -H "Content-Type: application/json" \
  -d @test-email.json
```

**test-email.json:**
```json
{
  "emailContent": "Your job on 01/06/2026 1:00 PM is confirmed. Please arrive on time and connect with the On-site Contact where appropriate for additional job coordination.\n\nFor questions about this job, please reach out to dfraser@matterport.com\n\nClient Company: Spencer Technologies (4)\nJob ID: JOBID643023143411658744\nProject Name: Subway-21376\nCapture Address: \"1301 Hwy 290 W Exxon Gas Station\" Dripping Springs TX 78620\nCapture Size: 1500 Square Feet (ft2)\nProperty Type: Commercial\nCapture Payout: 120 USD\nTravel Payout: 0 USD\nOff-Hours Payout: 0 USD\nTotal Payout: 120 USD\n\nOn-Site Contact Name: Tanvir Dhuka\nOn-Site Contact Email: tanvir1129@gmail.com\nOn-Site Contact Phone: (909) 2137903\n\nAdditional Details: Do not schedule during 11-1 or after 5"
}
```

## Step 5: Verify Auto-Matching

The system automatically:

### Client Matching
- Searches for existing client by name
- If "Matterport" exists → Uses existing client
- If not found → Creates new client with `clientType: 'outsourcing-partner'`

### Product Matching
- Searches for products by name (fuzzy match)
- If "Matterport Scan" exists → Uses existing product
- If not found → Creates new product (you'll need to set price later)

### End Client Handling
- For outsourced jobs: Extracts "Client Company:" from email
- Stores as `endClientName` and `endClientCompany`
- Shows both in calendar invite: "Outsourcing Partner: Matterport, End Client: Spencer Technologies (4)"

## Workflow After Email Received

1. **Email arrives** → Forwarded to jobs@your-domain
2. **API receives** → Gemini parses email content
3. **Job created** → Auto-populated with all fields
4. **You get notified** → Check admin panel
5. **Review job** → Verify data is correct, assign tech if needed
6. **Assign tech** → Calendar invite auto-sent
7. **Done!** → Tech has all job details in their calendar

## Troubleshooting

### Job not created
- Check server logs for errors
- Verify GEMINI_API_KEY is set
- Test with manual curl request first
- Check email forwarding service logs

### Wrong client assigned
- Gemini misidentified outsourcing partner
- Add partner to known list in parsing logic
- Manually correct in admin panel

### Missing fields
- Email format may be different than expected
- Check Gemini parsing output in logs
- Adjust prompt in `route.ts` if needed

### Duplicate jobs created
- Add duplicate detection logic (check jobId)
- Or manually delete duplicates

## Advanced: Custom Email Formats

If you receive emails from other partners (not Matterport), you may need to adjust the Gemini prompt in `src/app/api/parse-job-email/route.ts`.

Add examples for each partner's email format:

```typescript
Example 3 - Partner XYZ:
Email from: jobs@partnerxyz.com
"Property: ABC Building"
→ isOutsourced: true
→ client: "Partner XYZ"
→ endClientName: "ABC Building"
```

## Security Considerations

- **Validate sender**: Only accept emails from known partners
- **API authentication**: Add API key or webhook signature verification
- **Rate limiting**: Prevent spam/abuse
- **Manual review**: Always review auto-created jobs before assigning tech

## Production Deployment

1. Set environment variables in Railway:
   ```
   GEMINI_API_KEY=your_key
   ```

2. Update email forwarding URL to production:
   ```
   https://your-production-domain.com/api/parse-job-email
   ```

3. Test with a real email before going live

4. Monitor logs for parsing errors

## Future Enhancements

- [ ] Email confirmation sent back to you after job created
- [ ] Duplicate detection by jobId
- [ ] Support for attachments (floor plans, photos)
- [ ] Auto-assign tech based on availability
- [ ] SMS notification to tech when assigned
- [ ] Slack/Discord notifications for new jobs
