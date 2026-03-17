'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lead, Task, UserStats } from '@/lib/types'
import { isToday, isPast, differenceInDays, format } from 'date-fns'
import { CheckCircle2, Circle, Pin, Flame, Zap, Phone, Mail, MessageSquare, Linkedin, ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import LeadDetailModal from '@/components/modals/LeadDetailModal'

function DailyFocusContent() {
  const searchParams = useSearchParams()
  const justOne = searchParams.get('justOne') === '1'

  const [tasks, setTasks] = useState<Task[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [hotLeads, setHotLeads] = useState<Lead[]>([])
  const [staleLeads, setStaleLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [completedToday, setCompletedToday] = useState(0)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: s }, { data: t }, { data: l }] = await Promise.all([
      supabase.from('user_stats').select('*').single(),
      supabase.from('tasks').select('*, lead:leads(name,company,score,score_override), campaign:campaigns(name,color)')
        .eq('is_done', false).order('is_pinned', { ascending: false }).order('due_at'),
      supabase.from('leads').select('*').not('status', 'in', '(won,lost)').order('score', { ascending: false }),
    ])
    if (s) setStats(s)
    if (t) {
      const overdue = t.filter((task: Task) => task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at)))
      const today = t.filter((task: Task) => task.due_at && isToday(new Date(task.due_at)))
      setOverdueTasks(overdue)
      setTasks(today)
    }
    if (l) {
      const hot = l.filter((lead: Lead) => (lead.score_override ?? lead.score) >= 7)
        .sort((a: Lead, b: Lead) => (b.score_override ?? b.score) - (a.score_override ?? a.score))
      const stale = l.filter((lead: Lead) => lead.last_contacted_at &&
        differenceInDays(new Date(), new Date(lead.last_contacted_at)) > 14)
      setHotLeads(hot)
      setStaleLeads(stale)
    }
  }

  async function completeTask(taskId: string) {
    await supabase.from('tasks').update({ is_done: true }).eq('id', taskId)
    setTasks(t => t.filter(x => x.id !== taskId))
    setOverdueTasks(t => t.filter(x => x.id !== taskId))
    setCompletedToday(c => c + 1)
    // Award XP
    await fetch('/api/reminders', { method: 'PATCH', body: JSON.stringify({ action: 'xp', amount: 3 }), headers: { 'Content-Type': 'application/json' } })
  }

  const displayLeads = justOne ? hotLeads.slice(0, 1) : hotLeads

  return (
    <div className="min-h-screen bg-[#080c12] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#080c12]/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
            <div>
              <h1 className="font-display font-bold text-lg">
                {justOne ? '🎯 Just One Thing' : '📋 Daily Focus'}
              </h1>
              <p className="text-xs text-gray-400">
                {justOne ? 'Your single most important action right now' : format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>
          {completedToday > 0 && (
            <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <Zap size={14} /> {completedToday} done!
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xl">🔥</div>
              <div className="font-display font-bold">{stats.streak_days}</div>
              <div className="text-xs text-gray-500">streak</div>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xl">⚡</div>
              <div className="font-display font-bold">{stats.total_xp.toLocaleString()}</div>
              <div className="text-xs text-gray-500">XP</div>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xl">✅</div>
              <div className="font-display font-bold">{completedToday}</div>
              <div className="text-xs text-gray-500">today</div>
            </div>
          </div>
        )}

        {/* Overdue tasks */}
        {!justOne && overdueTasks.length > 0 && (
          <Section title="⚠️ Overdue" accent="red">
            {overdueTasks.map(task => (
              <TaskItem key={task.id} task={task} onComplete={completeTask} />
            ))}
          </Section>
        )}

        {/* Hot leads */}
        {displayLeads.length > 0 && (
          <Section title={justOne ? '🎯 Your One Thing' : '🔥 Hot Leads (Score 7+)'} accent="orange">
            {displayLeads.slice(0, justOne ? 1 : 10).map(lead => (
              <div key={lead.id} onClick={() => setSelectedLead(lead)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:bg-white/5 cursor-pointer transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0
                    ${(lead.score_override ?? lead.score) >= 9 ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {lead.score_override ?? lead.score}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{lead.name}</div>
                    <div className="text-xs text-gray-400">{lead.company}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.phone && <Phone size={14} className="text-gray-500" />}
                  {lead.email && <Mail size={14} className="text-gray-500" />}
                  {lead.linkedin_url && <Linkedin size={14} className="text-gray-500" />}
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Today's tasks */}
        {!justOne && tasks.length > 0 && (
          <Section title="📌 Today's Tasks" accent="blue">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} onComplete={completeTask} />
            ))}
          </Section>
        )}

        {/* Stale leads */}
        {!justOne && staleLeads.length > 0 && (
          <Section title="🕰 Stale Leads (14+ days)" accent="gray">
            {staleLeads.slice(0, 5).map(lead => (
              <div key={lead.id} onClick={() => setSelectedLead(lead)}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:bg-white/5 cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{lead.name}</div>
                  <div className="text-xs text-gray-400">{lead.company} · {lead.last_contacted_at ? `${differenceInDays(new Date(), new Date(lead.last_contacted_at))}d ago` : 'never contacted'}</div>
                </div>
                <ChevronRight size={14} className="text-gray-600" />
              </div>
            ))}
          </Section>
        )}

        {overdueTasks.length === 0 && tasks.length === 0 && hotLeads.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-display font-bold text-lg mb-1">You're all caught up!</div>
            <div className="text-gray-400 text-sm">No urgent tasks. Add more leads or campaigns to keep the momentum going.</div>
            <Link href="/" className="btn-primary mt-4 inline-block">Go to Dashboard</Link>
          </div>
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={() => { setSelectedLead(null); loadAll() }} />
      )}
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  const borderColor = accent === 'red' ? 'border-red-500/40' : accent === 'orange' ? 'border-cyan-500/40' : accent === 'blue' ? 'border-blue-500/40' : 'border-gray-500/40'
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-300 mb-2">{title}</h2>
      <div className={`space-y-2 border-l-2 pl-3 ${borderColor}`}>{children}</div>
    </div>
  )
}

function TaskItem({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const overdue = task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
      <button onClick={() => onComplete(task.id)} className="flex-shrink-0 text-gray-400 hover:text-green-400 transition-colors">
        <Circle size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{task.title}</div>
        {task.lead && <div className="text-xs text-gray-500">{(task.lead as any).name}</div>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.is_pinned && <Pin size={12} className="text-cyan-400" />}
        {task.due_at && (
          <span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
            {overdue ? '⚠' : ''} {format(new Date(task.due_at), 'h:mm a')}
          </span>
        )}
      </div>
    </div>
  )
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080c12] flex items-center justify-center text-gray-400">Loading...</div>}>
      <DailyFocusContent />
    </Suspense>
  )
}
