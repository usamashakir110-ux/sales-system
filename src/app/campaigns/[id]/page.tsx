'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Campaign, UserStats, Lead, Task } from '@/lib/types'
import { getLevelInfo, getFlameIntensity } from '@/lib/utils'
import Link from 'next/link'
import { format, isToday, isPast, differenceInMinutes } from 'date-fns'
import {
  Flame, Zap, Target, Plus, ChevronRight, Clock,
  TrendingUp, Trophy, Star, Coffee, ArrowRight, Trash2
} from 'lucide-react'
import CelebrationModal from '@/components/modals/CelebrationModal'
import NewCampaignModal from '@/components/modals/NewCampaignModal'
import DailyWisdom from '@/components/ui/DailyWisdom'

export default function Dashboard() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [callbacks, setCallbacks] = useState<Lead[]>([])
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [celebration, setCelebration] = useState<{title:string,subtitle:string,xp:number}|null>(null)
  const [now, setNow] = useState(new Date())
  const hour = now.getHours()

  useEffect(() => {
    loadAll()
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  async function loadAll() {
    const [{ data: s }, { data: c }, { data: t }, { data: cb }] = await Promise.all([
      supabase.from('user_stats').select('*').single(),
      supabase.from('campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, lead:leads(name,company), campaign:campaigns(name)').eq('is_done', false).order('due_at'),
      supabase.from('leads').select('*').not('scheduled_callback_at', 'is', null).gte('scheduled_callback_at', new Date().toISOString()),
    ])
    if (s) setStats(s)
    if (c) setCampaigns(c)
    if (t) setTodayTasks(t.filter((task: Task) => task.due_at && (isToday(new Date(task.due_at)) || isPast(new Date(task.due_at)))))
    if (cb) setCallbacks(cb.sort((a: Lead, b: Lead) => new Date(a.scheduled_callback_at!).getTime() - new Date(b.scheduled_callback_at!).getTime()))
  }

  async function deleteCampaign(e: React.MouseEvent, campaignId: string, campaignName: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${campaignName}"? This will also delete all leads inside it. This cannot be undone.`)) return
    await supabase.from('leads').delete().eq('campaign_id', campaignId)
    await supabase.from('campaigns').delete().eq('id', campaignId)
    setCampaigns(prev => prev.filter(c => c.id !== campaignId))
  }


  const flameIntensity = stats ? getFlameIntensity(stats.streak_days, hour) : 'dead'
  const flameClass = `flame-${flameIntensity}`

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function getCountdown(dateStr: string) {
    const diff = differenceInMinutes(new Date(dateStr), now)
    if (diff < 0) return { label: 'Overdue', urgent: true }
    if (diff < 2) return { label: `${diff}m`, urgent: true }
    if (diff < 60) return { label: `${diff}m`, urgent: diff < 10 }
    const h = Math.floor(diff / 60), m = diff % 60
    return { label: `${h}h ${m}m`, urgent: false }
  }

  return (
    <div className="min-h-screen bg-[#080c12]">
      {/* Top nav */}
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#080c12]/90 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #00d4ff, #00ff9d)'}}>
              <span className="text-gray-900 font-bold text-xs">SSE</span>
            </div>
            <div>
              <span className="font-display font-bold text-sm text-white">Shakir's Sales Engine</span>
              <div className="text-xs font-mono" style={{color: 'var(--brand)'}}>usama.shakir</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/daily', label: 'Daily Focus' },
              { href: '/focus', label: 'Focus Mode' },
              { href: '/templates', label: 'Templates' },
              { href: '/trophy', label: 'Trophy' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
              <Zap size={14} className="text-cyan-400" />
              <span className="text-sm font-medium">{stats.total_xp.toLocaleString()} XP</span>
              {stats.streak_multiplier > 1 && (
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">{stats.streak_multiplier}x</span>
              )}
            </div>
          )}
          <Link href="/review" className="btn-ghost text-xs px-3 py-1.5">End of Day</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Hero greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {greeting}, Usama 👊
            </h1>
            <p className="text-gray-400 mt-1">
              {todayTasks.length > 0
                ? `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today.`
                : 'All clear — add tasks or start a campaign.'}
            </p>
          </div>
          <Link href="/daily" className="btn-primary flex items-center gap-2 hidden md:flex">
            <Target size={16} /> Daily Focus <ArrowRight size={14} />
          </Link>
        </div>

        {/* Daily Wisdom */}
        <DailyWisdom />

        {/* Stats row */}
        {stats && levelInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Streak */}
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <span className={`text-3xl ${flameClass}`}>🔥</span>
              <div>
                <div className="font-display font-bold text-2xl">{stats.streak_days}</div>
                <div className="text-xs text-gray-400">Day streak</div>
                {stats.streak_multiplier > 1 && (
                  <div className="text-xs text-cyan-400 font-medium mt-0.5">{stats.streak_multiplier}x XP active!</div>
                )}
              </div>
            </div>

            {/* Level */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-display font-bold text-lg">Lv.{levelInfo.current.level}</div>
                  <div className="text-xs text-cyan-400 font-medium">{levelInfo.current.title}</div>
                </div>
                <Star size={20} className="text-cyan-400" />
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="xp-bar-fill h-full rounded-full transition-all duration-1000"
                  style={{ width: `${levelInfo.progress}%` }} />
              </div>
              {levelInfo.next && (
                <div className="text-xs text-gray-500 mt-1">{levelInfo.next.xp - stats.total_xp} XP to {levelInfo.next.title}</div>
              )}
            </div>

            {/* Weekly activity */}
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-gray-400 mb-2">This week</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Calls</span>
                  <span className="font-medium">{stats.weekly_calls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Emails</span>
                  <span className="font-medium">{stats.weekly_emails}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Deals</span>
                  <span className="font-medium text-green-400">{stats.weekly_deals}</span>
                </div>
              </div>
            </div>

            {/* Just One button */}
            <Link href="/daily?justOne=1"
              className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group cursor-pointer border border-dashed border-cyan-500/30 hover:border-cyan-500/60">
              <Coffee size={24} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-center">Just One Thing</div>
              <div className="text-xs text-gray-500 text-center">Low energy? Start here.</div>
            </Link>
          </div>
        )}

        {/* Upcoming callbacks countdown */}
        {callbacks.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-cyan-400" />
              <span className="font-medium text-sm">Scheduled Callbacks</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {callbacks.slice(0, 6).map(lead => {
                const cd = getCountdown(lead.scheduled_callback_at!)
                return (
                  <div key={lead.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${cd.urgent ? 'border-red-500/40 countdown-urgent' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}>
                    <div>
                      <div className="text-sm font-medium">{lead.name}</div>
                      <div className="text-xs text-gray-400">{lead.company}</div>
                    </div>
                    <div className={`font-display font-bold text-lg ${cd.urgent ? 'text-red-400' : 'text-cyan-400'}`}>
                      {cd.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Campaigns</h2>
            <button onClick={() => setShowNewCampaign(true)} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> New Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Target size={40} className="text-gray-600 mx-auto mb-3" />
              <div className="text-gray-400 mb-4">No campaigns yet. Create your first one.</div>
              <button onClick={() => setShowNewCampaign(true)} className="btn-primary">
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map(c => {
                const progress = c.goal_target > 0 ? Math.min((c.goal_current / c.goal_target) * 100, 100) : 0
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`}
                    className="glass rounded-2xl p-5 hover:bg-white/5 transition-all group block">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ backgroundColor: c.color }} />
                        <h3 className="font-display font-semibold">{c.name}</h3>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => deleteCampaign(e, c.id, c.name)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete campaign"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 mt-1 transition-colors" />
                      </div>
                    </div>

                    {c.goal_target > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                          <span>{c.goal_type} goal</span>
                          <span className="font-medium text-white">{c.goal_current}/{c.goal_target}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%`, backgroundColor: c.color }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Today's tasks preview */}
        {todayTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-lg">Due Today</h2>
              <Link href="/daily" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="glass rounded-2xl divide-y divide-[var(--border)]">
              {todayTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{task.title}</div>
                    {task.lead && <div className="text-xs text-gray-500">{(task.lead as any).name} · {(task.lead as any).company}</div>}
                  </div>
                  {task.due_at && (
                    <div className={`text-xs flex-shrink-0 ${isPast(new Date(task.due_at)) ? 'text-red-400' : 'text-gray-400'}`}>
                      {isPast(new Date(task.due_at)) ? 'Overdue' : format(new Date(task.due_at), 'h:mm a')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {showNewCampaign && (
        <NewCampaignModal
          onClose={() => setShowNewCampaign(false)}
          onCreated={() => { setShowNewCampaign(false); loadAll() }}
        />
      )}
      {celebration && (
        <CelebrationModal
          title={celebration.title}
          subtitle={celebration.subtitle}
          xp={celebration.xp}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  )
}
