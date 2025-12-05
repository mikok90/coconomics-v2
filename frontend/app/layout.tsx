import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from './auth-context'

export const metadata: Metadata = {
  title: 'Coconomics - Portfolio Manager',
  description: 'Professional portfolio management with Markowitz optimization',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Coconomics',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
