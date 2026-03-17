import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ReminderProvider from '@/components/ui/ReminderProvider'

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['400','500','600','700'] })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500'] })

export const metadata: Metadata = {
  title: 'SSE — Shakir\'s Sales Engine',
  description: 'Usama Shakir\'s personal sales command center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="bg-[#080c12] text-white font-sans antialiased">
        <ReminderProvider />
        {children}
      </body>
    </html>
  )
}
