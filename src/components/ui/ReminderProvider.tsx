'use client'
import { useReminderPoller } from '@/hooks/useReminderPoller'

export default function ReminderProvider() {
  useReminderPoller()
  return null
}
