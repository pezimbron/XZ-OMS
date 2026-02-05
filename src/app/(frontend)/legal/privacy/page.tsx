import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | XZ Reality Capture',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: February 4, 2026</p>

        <h2>Overview</h2>
        <p>
          XZ Reality Capture OMS (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) is an internal
          order management system operated by XZ Reality Capture for managing business operations,
          including client relationships, job scheduling, and financial data.
        </p>

        <h2>Information We Collect</h2>
        <p>The Service collects and processes:</p>
        <ul>
          <li>Business contact information (names, emails, phone numbers, addresses)</li>
          <li>Job and project data</li>
          <li>Financial records including invoices and payments</li>
          <li>Integration data from connected services (QuickBooks, Google Calendar)</li>
        </ul>

        <h2>How We Use Information</h2>
        <p>Information is used solely for:</p>
        <ul>
          <li>Managing client relationships and job scheduling</li>
          <li>Processing invoices and tracking payments</li>
          <li>Synchronizing data with accounting software (QuickBooks)</li>
          <li>Sending job-related notifications</li>
        </ul>

        <h2>Third-Party Integrations</h2>
        <p>
          This Service integrates with QuickBooks for accounting purposes. When you connect
          QuickBooks, we access customer, invoice, and vendor data as authorized. We do not
          sell or share this data with any other third parties.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures including encrypted connections (HTTPS),
          secure database storage, and access controls to protect your data.
        </p>

        <h2>Data Retention</h2>
        <p>
          Business data is retained as long as necessary for operational and legal requirements.
          You may request data deletion by contacting us.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy-related inquiries, contact us at:{' '}
          <a href="mailto:privacy@xzrealitycapture.com">privacy@xzrealitycapture.com</a>
        </p>
      </div>
    </div>
  )
}
