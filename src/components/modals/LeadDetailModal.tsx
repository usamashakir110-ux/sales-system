'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead, Touchpoint, Task, Template, LeadStatus, OutreachChannel, STATUS_COLORS, CHANNEL_COLORS, CADENCE_DAYS, XP_VALUES } from '@/lib/types'
import { format, addDays } from 'date-fns'
import {
  X, Phone, Mail, MessageSquare, Linkedin, Plus, Pin, Star,
  Clock, Calendar, ChevronDown, Save, Trash2, Trophy, Zap, ExternalLink
} from 'lucide-react'
import CelebrationModal from './CelebrationModal'

interface Props { lead: Lead; onClose: () => void; onUpdated: () => void }

const CHANNELS: { key: OutreachChannel; label: string; icon: any; color: string }[] = [
  { key: 'call', label: 'Call', icon: Phone, color: 'text-green-400' },
  { key: 'email', label: 'Email', icon: Mail, color: 'text-blue-400' },
  { key: 'message', label: 'Message', icon: MessageSquare, color: 'text-purple-400' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400' },
]

const STATUSES: LeadStatus[] = ['new', 'contacted', 'warm', 'proposal', 'won', 'lost']

export default function LeadDetailModal({ lead, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<'activity' | 'details' | 'tasks'>('activity')
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [currentLead, setCurrentLead] = useState<Lead>(lead)
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string; xp: number } | null>(null)

  // New touchpoint
  const [channel, setChannel] = useState<OutreachChannel>('call')
  const [outcome, setOutcome] = useState('')
  const [tpNotes, setTpNotes] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)

  // New task
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  // Callback
  const [callbackDate, setCallbackDate] = useState(lead.scheduled_callback_at ? format(new Date(lead.scheduled_callback_at), "yyyy-MM-dd'T'HH:mm") : '')

  // Score override
  const [scoreOverride, setScoreOverride] = useState<string>(lead.score_override?.toString() ?? '')

  // Status / won-lost
  const [status, setStatus] = useState<LeadStatus>(lead.status as LeadStatus)
  const [wonLostReason, setWonLostReason] = useState(lead.won_lost_reason || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: tp }, { data: t }, { data: tmpl }] = await Promise.all([
      supabase.from('touchpoints').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('lead_id', lead.id).order('due_at'),
      supabase.from('templates').select('*').order('channel'),
    ])
    if (tp) setTouchpoints(tp)
    if (t) setTasks(t)
    if (tmpl) setTemplates(tmpl)
  }

  async function logTouchpoint() {
    if (!outcome.trim()) return
    const multiplier = await getMultiplier()
    const xp = Math.round((XP_VALUES[channel] || 5) * multiplier)

    // Insert touchpoint
    await supabase.from('touchpoints').insert({
      lead_id: lead.id, channel, outcome, notes: tpNotes, xp_earned: xp
    })

    // Update lead last contacted + next cadence
    const cadenceIdx = CADENCE_DAYS.indexOf(currentLead.cadence_day)
    const nextCadenceDay = CADENCE_DAYS[Math.min(cadenceIdx + 1, CADENCE_DAYS.length - 1)]
    const nextContact = addDays(new Date(), nextCadenceDay - currentLead.cadence_day || nextCadenceDay)

    await supabase.from('leads').update({
      last_contacted_at: new Date().toISOString(),
      cadence_day: nextCadenceDay,
      next_contact_date: format(nextContact, 'yyyy-MM-dd'),
      status: status !== 'new' ? status : 'contacted',
    }).eq('id', lead.id)

    // Award XP + update streak
    await fetch('/api/reminders', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'xp', amount: xp }),
      headers: { 'Content-Type': 'application/json' }
    })

    // Update weekly stats
    const col = channel === 'call' ? 'weekly_calls' : channel === 'email' ? 'weekly_emails' : null
    if (col) {
      const { data: s } = await supabase.from('user_stats').select(col).single()
      if (s) await supabase.from('user_stats').update({ [col]: ((s as Record<string, number>)[col] || 0) + 1 })
    }

    setOutcome(''); setTpNotes('')
    await loadData()
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    setStatus(newStatus)
    if (newStatus === 'won') {
      // Big XP award + celebration
      const multiplier = await getMultiplier()
      const xp = Math.round(500 * multiplier)
      await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)
      await fetch('/api/reminders', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'xp', amount: xp }),
        headers: { 'Content-Type': 'application/json' }
      })
      // Update campaign goal
      await fetch('/api/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({ campaign_id: currentLead.campaign_id }),
        headers: { 'Content-Type': 'application/json' }
      })
      setCelebration({ title: '💰 DEAL CLOSED!', subtitle: `${currentLead.name} at ${currentLead.company}`, xp })
    }
  }

  async function getMultiplier(): Promise<number> {
    const { data } = await supabase.from('user_stats').select('streak_multiplier').single()
    return data?.streak_multiplier || 1
  }

  async function saveDetails() {
    setSaving(true)
    await supabase.from('leads').update({
      status,
      won_lost_reason: wonLostReason,
      score_override: scoreOverride ? parseInt(scoreOverride) : null,
      scheduled_callback_at: callbackDate ? new Date(callbackDate).toISOString() : null,
      is_pinned: currentLead.is_pinned,
      notes: currentLead.notes,
      phone: currentLead.phone,
      email: currentLead.email,
      linkedin_url: currentLead.linkedin_url,
    }).eq('id', lead.id)

    // Schedule reminder if callback set
    if (callbackDate) {
      await fetch('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({ lead_id: lead.id, lead_name: lead.name, callback_at: new Date(callbackDate).toISOString() }),
        headers: { 'Content-Type': 'application/json' }
      })
    }
    setSaving(false)
    onUpdated()
  }

  async function addTask() {
    if (!taskTitle.trim()) return
    await supabase.from('tasks').insert({
      lead_id: lead.id,
      campaign_id: lead.campaign_id,
      title: taskTitle,
      due_at: taskDue ? new Date(taskDue).toISOString() : null,
      priority: 'medium'
    })
    setTaskTitle(''); setTaskDue('')
    loadData()
  }

  async function toggleTaskDone(taskId: string, done: boolean) {
    await supabase.from('tasks').update({ is_done: done }).eq('id', taskId)
    loadData()
  }

  const channelTemplates = templates.filter(t => t.channel === channel)
  const displayScore = currentLead.score_override ?? currentLead.score

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
        <div className="bg-[#13131a] border border-[var(--border)] rounded-t-3xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-display font-bold text-xl">{lead.name}</h2>
                <button onClick={async () => {
                  const newPin = !currentLead.is_pinned
                  setCurrentLead(l => ({ ...l, is_pinned: newPin }))
                  await supabase.from('leads').update({ is_pinned: newPin }).eq('id', lead.id)
                }}>
                  <Pin size={16} className={currentLead.is_pinned ? 'text-orange-400 fill-orange-400' : 'text-gray-600 hover:text-gray-400'} />
                </button>
              </div>
              <div className="text-sm text-gray-400">{lead.company}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${STATUS_COLORS[status]}`}>{status}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${displayScore >= 8 ? 'bg-green-500/20 text-green-400' : displayScore >= 6 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {displayScore}
                </div>
                {currentLead.scheduled_callback_at && (
                  <span className="text-xs text-orange-400 flex items-center gap-1">
                    <Clock size={12} /> {format(new Date(currentLead.scheduled_callback_at), 'MMM d h:mm a')}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={20} /></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-5">
            {(['activity', 'details', 'tasks'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
                  ${tab === t ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                {t}
                {t === 'tasks' && tasks.filter(x => !x.is_done).length > 0 && (
                  <span className="ml-1.5 bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded-full">
                    {tasks.filter(x => !x.is_done).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ACTIVITY TAB */}
            {tab === 'activity' && (
              <div className="space-y-4">
                {/* Log touchpoint */}
                <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Log Outreach</p>

                  {/* Channel selector */}
                  <div className="flex gap-2 mb-3">
                    {CHANNELS.map(ch => (
                      <button key={ch.key} onClick={() => { setChannel(ch.key); setShowTemplate(false) }}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all
                          ${channel === ch.key ? 'bg-white/10 border border-white/20' : 'border border-transparent hover:bg-white/5'}`}>
                        <ch.icon size={16} className={channel === ch.key ? ch.color : 'text-gray-500'} />
                        {ch.label}
                      </button>
                    ))}
                  </div>

                  {/* Template button */}
                  {channelTemplates.length > 0 && (
                    <button onClick={() => setShowTemplate(s => !s)}
                      className="text-xs text-orange-400 hover:text-orange-300 mb-2 flex items-center gap-1">
                      <Star size={12} /> Use template <ChevronDown size={12} className={showTemplate ? 'rotate-180' : ''} />
                    </button>
                  )}
                  {showTemplate && (
                    <div className="mb-3 space-y-1.5">
                      {channelTemplates.map(tmpl => (
                        <button key={tmpl.id} onClick={() => { setTpNotes(tmpl.content); setShowTemplate(false) }}
                          className="w-full text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs">
                          <div className="font-medium text-gray-300">{tmpl.name}</div>
                          <div className="text-gray-500 line-clamp-1 mt-0.5">{tmpl.content}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <input value={outcome} onChange={e => setOutcome(e.target.value)}
                    placeholder={`Outcome (e.g. "Left voicemail", "Booked meeting")`}
                    className="input mb-2 text-sm" />
                  <textarea value={tpNotes} onChange={e => setTpNotes(e.target.value)}
                    placeholder="Notes / script used..."
                    rows={2} className="input resize-none mb-3 text-sm" />

                  <div className="flex items-center gap-2">
                    <button onClick={logTouchpoint} disabled={!outcome.trim()}
                      className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50">
                      <Zap size={14} /> Log +{XP_VALUES[channel]} XP
                    </button>
                    <span className="text-xs text-gray-500">Auto-schedules next follow-up</span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Timeline</p>
                  {touchpoints.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No touchpoints yet. Log your first outreach above.</p>
                  ) : (
                    <div className="space-y-2">
                      {touchpoints.map(tp => (
                        <div key={tp.id} className="flex gap-3 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                          <div className={`badge self-start mt-0.5 ${CHANNEL_COLORS[tp.channel as OutreachChannel]}`}>
                            {tp.channel}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{tp.outcome}</div>
                            {tp.notes && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tp.notes}</div>}
                            <div className="text-xs text-gray-600 mt-1">{format(new Date(tp.created_at), 'MMM d, h:mm a')}</div>
                          </div>
                          <div className="text-xs text-orange-400 font-medium flex-shrink-0">+{tp.xp_earned}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DETAILS TAB */}
            {tab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Status</label>
                    <select value={status} onChange={e => handleStatusChange(e.target.value as LeadStatus)}
                      className="input text-sm">
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Score Override (1-10)</label>
                    <input type="number" min="1" max="10" value={scoreOverride}
                      onChange={e => setScoreOverride(e.target.value)}
                      placeholder={`Auto: ${currentLead.score}`}
                      className="input text-sm" />
                  </div>
                </div>

                {(status === 'won' || status === 'lost') && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      {status === 'won' ? '🏆 Why did you win?' : '📋 Why was it lost?'}
                    </label>
                    <textarea value={wonLostReason} onChange={e => setWonLostReason(e.target.value)}
                      placeholder="What was the deciding factor?" rows={2} className="input resize-none text-sm" />
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1">
                    <Clock size={12} /> Schedule Callback
                  </label>
                  <input type="datetime-local" value={callbackDate} onChange={e => setCallbackDate(e.target.value)}
                    className="input text-sm" />
                  <p className="text-xs text-gray-500 mt-1">You'll get reminders 10 min and 2 min before.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Phone</label>
                    <input value={currentLead.phone} onChange={e => setCurrentLead(l => ({ ...l, phone: e.target.value }))}
                      className="input text-sm" placeholder="+1 555 000 0000" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Email</label>
                    <input value={currentLead.email} onChange={e => setCurrentLead(l => ({ ...l, email: e.target.value }))}
                      className="input text-sm" placeholder="name@company.com" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">LinkedIn URL</label>
                    <input value={currentLead.linkedin_url} onChange={e => setCurrentLead(l => ({ ...l, linkedin_url: e.target.value }))}
                      className="input text-sm" placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Notes</label>
                  <textarea value={currentLead.notes} onChange={e => setCurrentLead(l => ({ ...l, notes: e.target.value }))}
                    rows={3} className="input resize-none text-sm" placeholder="Key info about this lead..." />
                </div>

                <button onClick={saveDetails} disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* TASKS TAB */}
            {tab === 'tasks' && (
              <div className="space-y-4">
                <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Add Task</p>
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    placeholder="e.g. Send proposal, Follow up call..."
                    className="input mb-2 text-sm" />
                  <input type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                    className="input mb-3 text-sm" />
                  <button onClick={addTask} disabled={!taskTitle.trim()} className="btn-primary text-xs">
                    <Plus size={14} className="inline mr-1" /> Add Task
                  </button>
                </div>

                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No tasks yet.</p>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${task.is_done ? 'opacity-40 border-[var(--border)]' : 'bg-[var(--surface-2)] border-[var(--border)]'}`}>
                        <button onClick={() => toggleTaskDone(task.id, !task.is_done)}
                          className={`flex-shrink-0 ${task.is_done ? 'text-green-400' : 'text-gray-500 hover:text-green-400'}`}>
                          {task.is_done ? '✅' : '⭕'}
                        </button>
                        <div className="flex-1">
                          <div className={`text-sm ${task.is_done ? 'line-through text-gray-500' : 'font-medium'}`}>{task.title}</div>
                          {task.due_at && <div className="text-xs text-gray-500">{format(new Date(task.due_at), 'MMM d, h:mm a')}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {celebration && (
        <CelebrationModal
          title={celebration.title}
          subtitle={celebration.subtitle}
          xp={celebration.xp}
          onClose={() => { setCelebration(null); onUpdated() }}
        />
      )}
    </>
  )
}
