import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Document Analyzer',
  description: 'Upload a PDF to get an AI-powered analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#333', color: '#fff' },
          }}
        />
      </body>
    </html>
  )
}