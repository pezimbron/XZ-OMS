# Google Calendar API Setup Guide

This guide will help you set up Google Calendar API integration for automatic calendar invite creation when techs are assigned to jobs.

## Prerequisites

- Google account with access to Google Cloud Console
- Admin access to your OMS application

## Step 1: Install Required Package

Run the following command to install the Google APIs client library:

```bash
npm install googleapis
```

## Step 2: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "XZ-OMS Calendar Integration")
4. Click "Create"

## Step 3: Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: Internal (if using Google Workspace) or External
   - App name: "XZ-OMS"
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Add `https://www.googleapis.com/auth/calendar.events`
   - Click "Save and Continue"
4. Back to "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "XZ-OMS Calendar"
   - Authorized redirect URIs: Add `http://localhost:3000/oauth2callback` (for local dev)
   - For production, add your production URL: `https://your-domain.com/oauth2callback`
   - Click "Create"
5. **Save the Client ID and Client Secret** - you'll need these

## Step 5: Get Refresh Token

You need to authorize the app and get a refresh token. Run this Node.js script:

```javascript
// get-refresh-token.js
import { google } from 'googleapis'
import http from 'http'
import url from 'url'
import open from 'open'

const CLIENT_ID = 'YOUR_CLIENT_ID'
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

const scopes = ['https://www.googleapis.com/auth/calendar.events']

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
})

console.log('Authorize this app by visiting this url:', authUrl)
open(authUrl)

// Create a local server to receive the OAuth callback
const server = http.createServer(async (req, res) => {
  if (req.url.indexOf('/oauth2callback') > -1) {
    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams
    const code = qs.get('code')
    
    res.end('Authentication successful! Please return to the console.')
    server.close()

    const { tokens } = await oauth2Client.getToken(code)
    console.log('\n\nYour refresh token is:')
    console.log(tokens.refresh_token)
    console.log('\n\nAdd this to your .env file as GOOGLE_REFRESH_TOKEN')
  }
})

server.listen(3000, () => {
  console.log('Listening on port 3000...')
})
```

Run it:
```bash
node get-refresh-token.js
```

This will open a browser window. Authorize the app and copy the refresh token from the console.

## Step 6: Add Environment Variables

Add these to your `.env` file:

```env
# Google Calendar API
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
TIMEZONE=America/Chicago
```

**Important:** Replace the placeholder values with your actual credentials.

## Step 7: Test the Integration

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Create a test job:
   - Go to `/admin/collections/jobs`
   - Create a new job
   - Fill in required fields (client, modelName, targetDate with time)
   - Assign a technician (with a valid email)
   - Save

3. Check the technician's Google Calendar - they should receive a calendar invite with all job details!

## Calendar Invite Format

The calendar invite will include:

1. **To-Do List** - All line items from the job
2. **Client & Purpose** - Client name and purpose of scan
3. **Location & Size** - Address, square footage, property type
4. **On-Site Contact** - POC name, phone, email
5. **General Instructions** - Tech instructions from client template
6. **Specific Instructions** - Per-item instructions from product templates
7. **Upload Locations** - Primary and media upload links
8. **Job Info** - Job ID, priority

## Troubleshooting

### "Missing Google Calendar credentials" error
- Make sure all environment variables are set in `.env`
- Restart your dev server after adding env vars

### Calendar invite not created
- Check server logs for errors
- Verify the tech has a valid email address
- Ensure the job has a `targetDate` set

### "Invalid grant" error
- Your refresh token may have expired
- Re-run the get-refresh-token script to get a new one

### Calendar event created but tech didn't receive email
- Check that `sendUpdates: 'all'` is set in the API call
- Verify the tech's email is correct
- Check the tech's spam folder

## Production Deployment

For production:

1. Update `GOOGLE_REDIRECT_URI` in your `.env` to your production URL
2. Add the production redirect URI to your Google Cloud Console OAuth credentials
3. Set all environment variables in your Railway/hosting platform
4. Ensure your timezone is correct in the `TIMEZONE` env var

## Security Notes

- **Never commit `.env` file to git**
- Keep your Client Secret secure
- Refresh tokens don't expire unless revoked
- Use environment variables for all sensitive data
