import '@/app/oms/globals.css'

export const metadata = {
  title: 'XZ Reality Capture - Job Message',
  description: 'Secure job messaging for XZ Reality Capture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
