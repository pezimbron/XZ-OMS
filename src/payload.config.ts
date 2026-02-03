// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'

import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Comments } from './collections/Comments'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Clients } from './collections/Clients'
import { Technicians } from './collections/Technicians'
import { Vendors } from './collections/Vendors'
import { Products } from './collections/Products'
import { Equipment } from './collections/Equipment'
import { Jobs } from './collections/Jobs'
import { Invoices } from './collections/Invoices'
import { Notifications } from './collections/Notifications'
import { NotificationTemplates } from './collections/NotificationTemplates'
import { WorkflowTemplates } from './collections/WorkflowTemplates'
import { JobTemplates } from './collections/JobTemplates'
import { JobMessages } from './collections/JobMessages'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard'],
      // Custom unauthorized page with link back to OMS
      views: {
        Dashboard: {
          Component: '@/components/CustomDashboard',
        },
        Unauthorized: {
          Component: '@/components/Unauthorized',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: process.env.NODE_ENV !== 'production',
  }),
  email: resendAdapter({
    defaultFromAddress: process.env.RESEND_DEFAULT_EMAIL || 'noreply@xzoms.com',
    defaultFromName: 'XZ OMS',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  collections: [
    // Marketing / default CMS collections
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Comments,
    // OMS collections
    Clients,
    Technicians,
    Vendors,
    Products,
    Equipment,
    Jobs,
    Invoices,
    Notifications,
    NotificationTemplates,
    WorkflowTemplates,
    JobTemplates,
    JobMessages,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    // storage-adapter-placeholder
  ],
  endpoints: [
    {
      path: '/health',
      method: 'get',
      handler: async (req) => {
        return new Response('OK', { status: 200 });
      }
    }
  ],
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
