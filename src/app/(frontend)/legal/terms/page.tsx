import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | XZ Reality Capture',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>End-User License Agreement</h1>
        <p className="text-sm text-gray-500">Last updated: February 4, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using XZ Reality Capture OMS (&quot;the Service&quot;), you agree to be
          bound by these terms. This Service is an internal business management tool operated
          by XZ Reality Capture.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          The Service is an order management system for managing reality capture business
          operations, including client management, job scheduling, invoicing, and integrations
          with third-party services such as QuickBooks.
        </p>

        <h2>3. Authorized Use</h2>
        <p>
          Access to this Service is restricted to authorized XZ Reality Capture personnel,
          contractors, and designated business partners. Unauthorized access is prohibited.
        </p>

        <h2>4. Third-Party Integrations</h2>
        <p>
          The Service integrates with third-party services including:
        </p>
        <ul>
          <li>QuickBooks for accounting and invoicing</li>
          <li>Google Calendar for scheduling</li>
          <li>Email services for notifications</li>
        </ul>
        <p>
          Use of these integrations is subject to the respective third-party terms of service.
        </p>

        <h2>5. Data Ownership</h2>
        <p>
          All business data entered into the Service remains the property of XZ Reality Capture.
          Users are responsible for ensuring data accuracy.
        </p>

        <h2>6. Disclaimer</h2>
        <p>
          The Service is provided &quot;as is&quot; for internal business use. We make no warranties
          regarding uninterrupted access or error-free operation.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          XZ Reality Capture shall not be liable for any indirect, incidental, or consequential
          damages arising from use of the Service.
        </p>

        <h2>8. Modifications</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the Service
          constitutes acceptance of modified terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions about these terms, contact us at:{' '}
          <a href="mailto:legal@xzrealitycapture.com">legal@xzrealitycapture.com</a>
        </p>
      </div>
    </div>
  )
}
