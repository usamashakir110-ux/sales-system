'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserStats, Touchpoint } from '@/lib/types'
import { getLevelInfo } from '@/lib/utils'
import { ArrowLeft, Trophy, Zap, Flame, Phone, Mail, MessageSquare, Star } from 'lucide-react'
import Link from 'next/link'
import { format, startOfWeek, endOfWeek } from 'date-fns'

export default function TrophyPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [weekTouchpoints, setWeekTouchpoints] = useState<Touchpoint[]>([])
  const [weekDeals, setWeekDeals] = useState(0)
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

      const [{ data: s }, { data: t }, { data: won }, { data: r }] = await Promise.all([
        supabase.from('user_stats').select('*').single(),
        supabase.from('touchpoints').select('*').gte('created_at', weekStart).lte('created_at', weekEnd),
        supabase.from('leads').select('id').eq('status', 'won').gte('created_at', weekStart),
        supabase.from('daily_reviews').select('*').order('date', { ascending: false }).limit(7),
      ])
      if (s) setStats(s)
      if (t) setWeekTouchpoints(t)
      if (won) setWeekDeals(won.length)
      if (r) setReviews(r)
    }
    load()
  }, [])

  const levelInfo = stats ? getLevelInfo(stats.total_xp) : null

  const callCount = weekTouchpoints.filter(t => t.channel === 'call').length
  const emailCount = weekTouchpoints.filter(t => t.channel === 'email').length
  const msgCount = weekTouchpoints.filter(t => t.channel === 'message').length
  const liCount = weekTouchpoints.filter(t => t.channel === 'linkedin').length
  const weekXP = weekTouchpoints.reduce((s, t) => s + (t.xp_earned || 0), 0)

  const moodEmojis = ['', '😩', '😕', '😐', '😊', '🔥']

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <h1 className="font-display font-bold text-lg">Trophy Case</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Level card */}
        {stats && levelInfo && (
          <div className="glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Level</div>
                <div className="font-display font-black text-5xl text-orange-400">{levelInfo.current.level}</div>
                <div className="font-display font-semibold text-lg text-orange-300 mt-1">{levelInfo.current.title}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Total XP</div>
                <div className="font-display font-bold text-2xl">{stats.total_xp.toLocaleString()}</div>
                {stats.streak_days > 0 && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xl">🔥</span>
                    <span className="font-bold text-orange-400">{stats.streak_days} day streak</span>
                  </div>
                )}
              </div>
            </div>
            {levelInfo.next && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Progress to {levelInfo.next.title}</span>
                  <span>{levelInfo.next.xp - stats.total_xp} XP to go</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="xp-bar-fill h-full rounded-full" style={{ width: `${levelInfo.progress}%` }} />
                </div>
              </div>
            )}
            {stats.streak_multiplier > 1 && (
              <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-sm text-orange-300">
                🔥 Hot Streak! You're earning <strong>{stats.streak_multiplier}x XP</strong> on all actions.
              </div>
            )}
          </div>
        )}

        {/* This week */}
        <div>
          <h2 className="font-display font-semibold text-base mb-3">
            This Week · {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} – {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calls', count: callCount, icon: '📞', color: 'text-green-400' },
              { label: 'Emails', count: emailCount, icon: '📧', color: 'text-blue-400' },
              { label: 'Messages', count: msgCount, icon: '💬', color: 'text-purple-400' },
              { label: 'LinkedIn', count: liCount, icon: '💼', color: 'text-sky-400' },
              { label: 'Deals Won', count: weekDeals, icon: '🤝', color: 'text-green-400' },
              { label: 'XP Earned', count: weekXP, icon: '⚡', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="glass rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className={`font-display font-bold text-2xl ${item.color}`}>{item.count}</div>
                  <div className="text-xs text-gray-400">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal bests */}
        {stats && (
          <div>
            <h2 className="font-display font-semibold text-base mb-3">Personal Bests</h2>
            <div className="glass rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy size={20} className="text-amber-400" />
                <div>
                  <div className="font-medium">Best Focus Session</div>
                  <div className="text-xs text-gray-400">Most calls in a single session</div>
                </div>
              </div>
              <div className="font-display font-bold text-2xl text-amber-400">{stats.personal_best_calls_session}</div>
            </div>
          </div>
        )}

        {/* Recent mood log */}
        {reviews.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-base mb-3">Recent Reviews</h2>
            <div className="glass rounded-2xl divide-y divide-[var(--border)]">
              {reviews.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{format(new Date(r.date), 'EEEE, MMM d')}</div>
                    {r.wins && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.wins}</div>}
                  </div>
                  <span className="text-2xl">{moodEmojis[r.mood] || '😐'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
