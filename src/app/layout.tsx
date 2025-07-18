import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/index.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trail Blaze - Invest & Earn',
  description: 'Learn, invest, and earn through interactive learning trails',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
} 