'use client'
import { useEffect, useRef } from 'react'

export function useReminderPoller() {
  const lastChecked = useRef<string>('')

  useEffect(() => {
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    async function checkReminders() {
      const now = new Date().toISOString()
      if (lastChecked.current === now.split('T')[1].substring(0, 5)) return
      lastChecked.current = now.split('T')[1].substring(0, 5)

      try {
        const res = await fetch('/api/reminders')
        const { tasks } = await res.json()

        if (tasks && tasks.length > 0 && Notification.permission === 'granted') {
          for (const task of tasks) {
            const isCallback = task.title.includes('CALL IN')
            new Notification(isCallback ? '📞 Callback Reminder' : '📌 Task Due', {
              body: task.title,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: task.id,
              requireInteraction: isCallback,
            })
          }
        }
      } catch { }
    }

    // Check every minute
    checkReminders()
    const interval = setInterval(checkReminders, 60 * 1000)

    // Also send morning briefing at 8am
    const now = new Date()
    if (now.getHours() === 8 && now.getMinutes() < 5) {
      const todayKey = `briefing-${now.toISOString().split('T')[0]}`
      if (!localStorage.getItem(todayKey)) {
        fetch('/api/morning-briefing', { method: 'POST' })
        localStorage.setItem(todayKey, '1')
      }
    }

    return () => clearInterval(interval)
  }, [])
}
