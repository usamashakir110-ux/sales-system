import type { Metadata } from 'next'
import { Sora, DM_Sans } from 'next/font/google'
import './globals.css'
import ReminderProvider from '@/components/ui/ReminderProvider'

const display = Sora({ subsets: ['latin'], variable: '--font-display', weight: ['400','600','700','800'] })
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400','500','600'] })

export const metadata: Metadata = {
  title: 'SalesOS — Your Sales Command Center',
  description: 'Personal sales system with gamification, reminders, and discipline tools',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-[#0a0a0f] text-white font-sans antialiased">
        <ReminderProvider />
        {children}
      </body>
    </html>
  )
}
