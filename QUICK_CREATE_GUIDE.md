# Quick Create Job - User Guide

## What is Quick Create?

Quick Create Job is a feature that lets you paste email content from job requests (like Matterport confirmations) and automatically create jobs in the OMS using AI.

**No email forwarding setup needed** - just copy, paste, and create!

## How to Use

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key
4. Add to your `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
5. Restart your dev server: `npm run dev`

### Step 2: Access Quick Create

1. Go to your admin panel: `http://localhost:3000/admin`
2. Navigate to: `http://localhost:3000/admin/quick-create-job`
3. Or bookmark this URL for quick access

### Step 3: Create a Job from Email

1. **Receive job request email** (e.g., Matterport appointment confirmation)
2. **Copy the entire email content** (Ctrl+A, Ctrl+C in your email client)
3. **Paste into the text box** in Quick Create
4. **Click "Parse & Create Job"**
5. **Wait 2-3 seconds** while AI extracts the data
6. **You'll be redirected** to the newly created job
7. **Review the data** - verify all fields are correct
8. **Assign a tech** if not already assigned
9. **Done!** Calendar invite is automatically sent

## What Gets Auto-Filled

The AI will automatically extract and populate:

### Basic Info
- ✅ Job ID
- ✅ Model/Project Name
- ✅ Priority (if mentioned)
- ✅ Status (defaults to "scheduled")

### Client Information
- ✅ Client/Outsourcing Partner (e.g., Matterport)
- ✅ End Client Name (e.g., "Spencer Technologies (4)")
- ✅ End Client Company (e.g., "Spencer Technologies")
- ✅ Outsourced flag (automatically detected)

### Location
- ✅ Capture Address
- ✅ City
- ✅ State
- ✅ Zip Code
- ✅ Square Footage
- ✅ Property Type (Commercial/Residential/Industrial)

### Contact
- ✅ On-Site POC Name
- ✅ On-Site POC Phone
- ✅ On-Site POC Email

### Scheduling
- ✅ Target Date & Time
- ✅ Scheduling Notes/Restrictions

### Financial
- ✅ Capture Payout (vendorPrice)
- ✅ Travel Payout
- ✅ Off-Hours Payout

### Services
- ✅ Capture Type (Matterport/LiDAR/Drone)
- ✅ Purpose of Scan
- ✅ Line Items (products/services)

## Example: Matterport Email

**Email content:**
```
Your job on 01/06/2026 1:00 PM is confirmed.

Client Company: Spencer Technologies (4)
Job ID: JOBID643023143411658744
Project Name: Subway-21376
Capture Address: "1301 Hwy 290 W Exxon Gas Station" Dripping Springs TX 78620
Capture Size: 1500 Square Feet (ft2)
Property Type: Commercial
Capture Payout: 120 USD
Travel Payout: 0 USD
Total Payout: 120 USD

On-Site Contact Name: Tanvir Dhuka
On-Site Contact Email: tanvir1129@gmail.com
On-Site Contact Phone: (909) 2137903

Additional Details: Do not schedule during 11-1 or after 5
```

**Result:**
- Client: Matterport (auto-matched or created)
- End Client Name: Spencer Technologies (4)
- End Client Company: Spencer Technologies
- Job ID: JOBID643023143411658744
- Model Name: Subway-21376
- Address: 1301 Hwy 290 W Exxon Gas Station, Dripping Springs, TX 78620
- Square Feet: 1500
- Property Type: Commercial
- Vendor Price: $120
- POC: Tanvir Dhuka, (909) 2137903, tanvir1129@gmail.com
- Scheduling Notes: Do not schedule during 11-1 or after 5
- Target Date: 2026-01-06 13:00:00
- Is Outsourced: ✅

## After Job is Created

1. **Review the job** - Check all fields are correct
2. **Edit if needed** - Fix any parsing errors
3. **Assign technician** - Select from dropdown
4. **Calendar invite sent** - Tech receives email with all details
5. **Track progress** - Update status as job progresses

## Tips for Best Results

### ✅ Do:
- Paste the **entire email** including headers
- Include all details even if they seem redundant
- Use emails from known partners (Matterport, etc.)
- Review the created job before assigning tech

### ❌ Don't:
- Paste partial emails (missing key info)
- Edit the email content before pasting
- Expect 100% accuracy on unusual formats
- Skip the review step

## Troubleshooting

### "Failed to parse email"
- Check that GEMINI_API_KEY is set in .env
- Restart dev server after adding API key
- Verify email content is complete

### Missing fields after parsing
- Email format may be non-standard
- Manually fill in missing fields
- Report format to improve AI prompt

### Wrong client assigned
- Manually correct in the job edit form
- Add client to known partners list

### Duplicate jobs created
- Check if job already exists before parsing
- Delete duplicate manually if needed

## Keyboard Shortcuts

- `Ctrl+V` - Paste email content
- `Enter` - Parse & Create (when text box is focused)
- `Esc` - Clear text box

## Advanced: Custom Email Formats

If you receive emails from partners other than Matterport, the AI will attempt to parse them. The more structured the email, the better the results.

Common formats supported:
- Matterport appointment confirmations
- Standard job request emails with labeled fields
- Calendar invites with job details

## Future Enhancements

Coming soon:
- [ ] Batch create multiple jobs from multiple emails
- [ ] Save email templates for quick re-use
- [ ] Auto-assign tech based on availability
- [ ] Duplicate detection before creating
- [ ] Preview parsed data before creating job
