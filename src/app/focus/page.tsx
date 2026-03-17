'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead, UserStats } from '@/lib/types'
import { Play, Pause, Square, Zap, ChevronRight, Trophy } from 'lucide-react'
import Link from 'next/link'
import LeadDetailModal from '@/components/modals/LeadDetailModal'

type SessionState = 'idle' | 'running' | 'paused' | 'done'

export default function FocusPage() {
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [duration, setDuration] = useState(45)
  const [elapsed, setElapsed] = useState(0)
  const [leads, setLeads] = useState<Lead[]>([])
  const [sessionLeads, setSessionLeads] = useState<Lead[]>([])
  const [contactedCount, setContactedCount] = useState(0)
  const [personalBest, setPersonalBest] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadData()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  async function loadData() {
    const [{ data: l }, { data: s }] = await Promise.all([
      supabase.from('leads').select('*').not('status', 'in', '(won,lost)').order('score', { ascending: false }).limit(20),
      supabase.from('user_stats').select('*').single(),
    ])
    if (l) setLeads(l)
    if (s) setPersonalBest(s.personal_best_calls_session || 0)
  }

  function startSession() {
    setSessionLeads(leads.filter(l => (l.score_override ?? l.score) >= 6).slice(0, 10))
    setContactedCount(0)
    setSessionXP(0)
    setElapsed(0)
    setSessionState('running')
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        if (e >= duration * 60) {
          endSession()
          return e
        }
        return e + 1
      })
    }, 1000)
  }

  function pauseSession() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSessionState('paused')
  }

  function resumeSession() {
    setSessionState('running')
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
  }

  async function endSession() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSessionState('done')
    if (contactedCount > personalBest) {
      await supabase.from('user_stats').update({ personal_best_calls_session: contactedCount }).eq('id', (await supabase.from('user_stats').select('id').single()).data?.id)
      setPersonalBest(contactedCount)
    }
  }

  function handleLeadContacted(lead: Lead) {
    setContactedCount(c => c + 1)
    setSessionXP(x => x + 10)
    setSessionLeads(l => l.filter(x => x.id !== lead.id))
  }

  const remaining = duration * 60 - elapsed
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const progress = (elapsed / (duration * 60)) * 100

  if (sessionState === 'done') {
    const isNewRecord = contactedCount > 0 && contactedCount >= personalBest
    return (
      <div className="min-h-screen bg-[#080c12] flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-8 md:p-12 text-center max-w-md w-full animate-pop-in">
          <div className="text-6xl mb-4">{isNewRecord ? '🏆' : '💪'}</div>
          <h1 className="font-display font-bold text-3xl mb-2">Session Complete!</h1>
          {isNewRecord && <p className="text-cyan-400 font-medium mb-4">🎉 New Personal Best!</p>}
          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="font-display font-bold text-2xl text-cyan-400">{contactedCount}</div>
              <div className="text-xs text-gray-400 mt-1">Leads contacted</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="font-display font-bold text-2xl text-green-400">{sessionXP}</div>
              <div className="text-xs text-gray-400 mt-1">XP earned</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="font-display font-bold text-2xl">{Math.floor(elapsed / 60)}m</div>
              <div className="text-xs text-gray-400 mt-1">Time focused</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="font-display font-bold text-2xl text-purple-400">{personalBest}</div>
              <div className="text-xs text-gray-400 mt-1">Personal best</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSessionState('idle'); setElapsed(0) }} className="btn-primary flex-1">
              New Session
            </button>
            <Link href="/" className="btn-ghost flex-1 text-center">Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  if (sessionState === 'idle') {
    return (
      <div className="min-h-screen bg-[#080c12] flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-8 md:p-12 text-center max-w-md w-full">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="font-display font-bold text-3xl mb-2">Focus Mode</h1>
          <p className="text-gray-400 mb-8">Lock in. No distractions. Just you and your leads.</p>

          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-3">Session duration</p>
            <div className="flex gap-2 justify-center">
              {[25, 45, 60, 90].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${duration === d ? 'bg-cyan-500 text-white' : 'glass text-gray-400 hover:text-white'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-sm text-gray-400 mb-6 glass rounded-xl p-4">
            <span>Personal best: <span className="text-white font-medium">{personalBest} calls</span></span>
            <span>{leads.filter(l => (l.score_override ?? l.score) >= 6).length} leads ready</span>
          </div>

          <button onClick={startSession} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
            <Play size={20} fill="white" /> Start Focus Session
          </button>
          <Link href="/" className="btn-ghost w-full mt-3 text-center block">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  // Active session
  return (
    <div className="min-h-screen bg-[#080c12] flex flex-col">
      {/* Timer bar */}
      <div className="h-1 bg-white/10">
        <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className={`font-display font-bold text-4xl ${remaining < 300 ? 'text-red-400' : 'text-cyan-400'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div>
            <div className="text-sm text-gray-400">remaining</div>
            <div className="text-xs text-gray-500">personal best: {personalBest} calls</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="font-display font-bold text-2xl text-green-400">{contactedCount}</div>
            <div className="text-xs text-gray-500">contacted</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-2xl text-cyan-400">{sessionXP}</div>
            <div className="text-xs text-gray-500">XP</div>
          </div>
          <div className="flex gap-2">
            {sessionState === 'running' ? (
              <button onClick={pauseSession} className="btn-ghost p-2"><Pause size={18} /></button>
            ) : (
              <button onClick={resumeSession} className="btn-primary p-2"><Play size={18} /></button>
            )}
            <button onClick={endSession} className="btn-ghost p-2 text-red-400"><Square size={18} /></button>
          </div>
        </div>
      </div>

      {/* Beat your record banner */}
      {contactedCount > 0 && contactedCount >= personalBest && (
        <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-6 py-2 text-center">
          <span className="text-cyan-400 text-sm font-medium animate-pulse">
            🔥 You're matching your personal best! Keep going!
          </span>
        </div>
      )}

      {/* Leads */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 max-w-2xl mx-auto w-full">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Your session leads — click to open</p>
        <div className="space-y-2">
          {sessionLeads.map(lead => (
            <div key={lead.id} onClick={() => setSelectedLead(lead)}
              className="flex items-center justify-between p-4 glass rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${(lead.score_override ?? lead.score) >= 8 ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  {lead.score_override ?? lead.score}
                </div>
                <div>
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-xs text-gray-400">{lead.company} · {lead.phone || lead.email}</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
            </div>
          ))}
          {sessionLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🏆</div>
              <p>You've gone through all session leads!</p>
              <button onClick={endSession} className="btn-primary mt-4">End Session</button>
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => {
            handleLeadContacted(selectedLead)
            setSelectedLead(null)
          }}
        />
      )}
    </div>
  )
}
