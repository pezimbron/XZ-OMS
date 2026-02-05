import '@/app/oms/globals.css'

export const metadata = {
  title: 'XZ Reality Capture',
  description: 'XZ Reality Capture Services',
}

export default function FrontendLayout({
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
