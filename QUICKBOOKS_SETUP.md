# QuickBooks Integration Setup

This guide will help you set up QuickBooks integration for automatic client synchronization.

## Prerequisites

1. QuickBooks Online account (Sandbox or Production)
2. QuickBooks Developer account at https://developer.intuit.com

## Step 1: Install Required Package

```bash
npm install intuit-oauth
```

## Step 2: Create QuickBooks App

1. Go to https://developer.intuit.com/app/developer/myapps
2. Click "Create an app"
3. Select "QuickBooks Online and Payments"
4. Fill in app details:
   - **App Name**: XZ-OMS
   - **Description**: Order Management System for XZ
5. In the "Keys & credentials" section, note your:
   - **Client ID**
   - **Client Secret**

## Step 3: Configure Redirect URI

In your QuickBooks app settings, add the redirect URI:

**Development:**
```
http://localhost:3001/api/quickbooks/callback
```

**Production:**
```
https://oms.xzrealitycapture.com/api/quickbooks/callback
```

## Step 4: Add Environment Variables

Add these to your `.env` file:

```env
# QuickBooks Configuration
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/quickbooks/callback
```

## Step 5: Regenerate Payload Types

After modifying the Clients collection, regenerate types:

```bash
npm run payload generate:types
```

## Step 6: Restart Development Server

```bash
npm run dev
```

## How to Use

### Connect to QuickBooks

1. Navigate to `/oms/settings` (to be created)
2. Click "Connect to QuickBooks"
3. Authorize the app in QuickBooks
4. You'll be redirected back to OMS

### Sync Clients

**Automatic Sync:**
- Clients are automatically synced when created or updated in Payload admin

**Manual Sync:**
- Single client: Click "Sync to QuickBooks" button on client detail page
- All clients: Use the sync dashboard at `/oms/settings`

### API Endpoints

**Authenticate:**
```
GET /api/quickbooks/auth
```

**OAuth Callback:**
```
GET /api/quickbooks/callback
```

**Sync Single Client:**
```
POST /api/quickbooks/sync
Body: { "clientId": "client_id_here" }
```

**Sync All Clients:**
```
POST /api/quickbooks/sync
Body: { "syncAll": true }
```

## Client Sync Fields

Each client now has an "External Integrations" section with:

- **QuickBooks Customer ID**: Auto-populated after sync
- **Sync Status**: not-synced, synced, error, pending
- **Last Synced**: Timestamp of last successful sync
- **Sync Error**: Error message if sync failed

## Troubleshooting

### "Cannot find module 'intuit-oauth'"
Run: `npm install intuit-oauth`

### "Invalid redirect URI"
Make sure the redirect URI in your QuickBooks app matches exactly with your environment variable

### "Token expired"
Tokens expire after 1 hour. The system will automatically refresh them, but you may need to re-authenticate if the refresh token expires (after 100 days)

### Sync errors
Check the client's "Sync Error Message" field in Payload admin for details

## Next Steps

1. Install the package: `npm install intuit-oauth`
2. Add environment variables
3. Regenerate types: `npm run payload generate:types`
4. Restart server: `npm run dev`
5. Connect to QuickBooks via `/api/quickbooks/auth`
6. Test sync with a single client

## Production Setup

To go live with QuickBooks production, you need to complete Intuit's production approval process:

### Required Pages
- **Privacy Policy**: `/legal/privacy`
- **Terms of Service**: `/legal/terms`

### Intuit Developer Form Values

| Field | Value |
|-------|-------|
| Host domain | `oms.xzrealitycapture.com` |
| Launch URL | `https://oms.xzrealitycapture.com/oms` |
| Disconnect URL | `https://oms.xzrealitycapture.com/oms` |
| Redirect URI | `https://oms.xzrealitycapture.com/api/quickbooks/callback` |

### Production Environment Variables

```env
QUICKBOOKS_CLIENT_ID=<production_client_id>
QUICKBOOKS_CLIENT_SECRET=<production_client_secret>
QUICKBOOKS_ENVIRONMENT=production
QUICKBOOKS_REDIRECT_URI=https://oms.xzrealitycapture.com/api/quickbooks/callback
```

### IP Address Note
The app is hosted on Railway/Vercel which uses dynamic IPs. If Intuit requires IP addresses, explain it's cloud-hosted or contact Intuit support.

---

## Future Enhancements

- [ ] Token storage in database (currently file-based)
- [ ] Automatic token refresh
- [ ] Sync status dashboard in OMS
- [ ] Webhook support for bi-directional sync
