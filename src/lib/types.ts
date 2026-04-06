export type LeadStatus = 'new' | 'contacted' | 'warm' | 'proposal' | 'won' | 'lost'
export type OutreachChannel = 'call' | 'email' | 'message' | 'linkedin'
export type Priority = 'low' | 'medium' | 'high'

export interface Campaign {
  id: string
  name: string
  description: string
  goal_type: 'calls' | 'deals' | 'meetings'
  goal_target: number
  goal_current: number
  color: string
  created_at: string
  is_active: boolean
  parent_campaign_id: string | null
}

export interface Lead {
  id: string
  campaign_id: string
  name: string
  company: string
  email: string
  phone: string
  linkedin_url: string
  status: LeadStatus
  priority: Priority
  score: number
  score_override: number | null
  notes: string
  won_lost_reason: string
  scheduled_callback_at: string | null
  next_contact_date: string | null
  cadence_day: number
  is_pinned: boolean
  created_at: string
  last_contacted_at: string | null
  campaign?: Campaign
}

export interface Touchpoint {
  id: string
  lead_id: string
  channel: OutreachChannel
  outcome: string
  notes: string
  xp_earned: number
  created_at: string
  lead?: Lead
}

export interface Task {
  id: string
  lead_id: string | null
  campaign_id: string | null
  title: string
  due_at: string
  is_done: boolean
  is_pinned: boolean
  priority: Priority
  created_at: string
  lead?: Lead
  campaign?: Campaign
}

export interface Template {
  id: string
  channel: OutreachChannel
  name: string
  content: string
  created_at: string
}

export interface UserStats {
  id: string
  total_xp: number
  level: number
  streak_days: number
  streak_multiplier: number
  last_activity_date: string | null
  personal_best_calls_session: number
  weekly_calls: number
  weekly_emails: number
  weekly_deals: number
  updated_at: string
}

export interface DailyReview {
  id: string
  date: string
  wins: string
  missed: string
  tomorrow_intentions: string
  mood: number
  created_at: string
}

export const XP_VALUES: Record<string, number> = {
  call: 10,
  email: 5,
  message: 4,
  linkedin: 7,
  deal_won: 500,
  task_done: 3,
}

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Prospector' },
  { level: 2, xp: 100, title: 'Dialer' },
  { level: 3, xp: 300, title: 'Connector' },
  { level: 4, xp: 600, title: 'Closer' },
  { level: 5, xp: 1000, title: 'Rainmaker' },
  { level: 6, xp: 1600, title: 'Hunter' },
  { level: 7, xp: 2400, title: 'Dealmaker' },
  { level: 8, xp: 3500, title: 'Sales Machine' },
  { level: 9, xp: 5000, title: 'Legend' },
  { level: 10, xp: 7500, title: 'GOAT' },
]

export const CADENCE_DAYS = [1, 3, 7, 14]

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  warm: 'bg-amber-100 text-amber-700',
  proposal: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export const CHANNEL_COLORS: Record<OutreachChannel, string> = {
  call: 'bg-green-100 text-green-700',
  email: 'bg-blue-100 text-blue-700',
  message: 'bg-purple-100 text-purple-700',
  linkedin: 'bg-sky-100 text-sky-700',
}
