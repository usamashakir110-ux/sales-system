import { LEVEL_THRESHOLDS, XP_VALUES, UserStats } from './types'

export function getLevelInfo(xp: number) {
  let current = LEVEL_THRESHOLDS[0]
  let next = LEVEL_THRESHOLDS[1]
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i]
      next = LEVEL_THRESHOLDS[i + 1] || null
      break
    }
  }
  const progress = next
    ? ((xp - current.xp) / (next.xp - current.xp)) * 100
    : 100
  return { current, next, progress: Math.min(progress, 100) }
}

export function calcAutoScore(touchpointCount: number, lastContactedDaysAgo: number | null, status: string): number {
  let score = 5
  if (touchpointCount >= 3) score += 1
  if (touchpointCount >= 6) score += 1
  if (status === 'warm') score += 1
  if (status === 'proposal') score += 2
  if (lastContactedDaysAgo !== null && lastContactedDaysAgo > 14) score -= 2
  if (lastContactedDaysAgo !== null && lastContactedDaysAgo > 30) score -= 2
  return Math.max(1, Math.min(10, score))
}

export function getXpForAction(channel: string, multiplier: number = 1): number {
  return Math.round((XP_VALUES[channel] || 5) * multiplier)
}

export function isStreakAlive(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false
  const last = new Date(lastActivityDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 1
}

export function getFlameIntensity(streakDays: number, hourOfDay: number): 'dead' | 'dim' | 'normal' | 'hot' | 'inferno' {
  if (streakDays === 0) return 'dead'
  if (hourOfDay >= 14 && streakDays < 3) return 'dim'
  if (streakDays >= 10) return 'inferno'
  if (streakDays >= 5) return 'hot'
  return 'normal'
}

export function getNextCadenceDate(cadenceDay: number): Date {
  const CADENCE = [1, 3, 7, 14]
  const idx = CADENCE.indexOf(cadenceDay)
  const nextDay = CADENCE[idx + 1] || 14
  const date = new Date()
  date.setDate(date.getDate() + (nextDay - cadenceDay))
  return date
}
