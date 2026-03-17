'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle, Save } from 'lucide-react'
import Link from 'next/link'

export default function ReviewPage() {
  const [wins, setWins] = useState('')
  const [missed, setMissed] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [mood, setMood] = useState(3)
  const [saved, setSaved] = useState(false)
  const [existing, setExisting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    supabase.from('daily_reviews').select('*').eq('date', today).single()
      .then(({ data }) => {
        if (data) {
          setWins(data.wins); setMissed(data.missed)
          setTomorrow(data.tomorrow_intentions); setMood(data.mood)
          setExisting(true)
        }
      })
  }, [])

  async function save() {
    const payload = { date: today, wins, missed, tomorrow_intentions: tomorrow, mood }
    if (existing) {
      await supabase.from('daily_reviews').update(payload).eq('date', today)
    } else {
      await supabase.from('daily_reviews').insert(payload)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const moods = [
    { val: 1, emoji: '😩', label: 'Rough' },
    { val: 2, emoji: '😕', label: 'Meh' },
    { val: 3, emoji: '😐', label: 'Okay' },
    { val: 4, emoji: '😊', label: 'Good' },
    { val: 5, emoji: '🔥', label: 'On fire' },
  ]

  return (
    <div className="min-h-screen bg-[#080c12] pb-20">
      <div className="sticky top-0 z-30 bg-[#080c12]/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="font-display font-bold text-lg">End of Day Review</h1>
            <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Wins first */}
        <div className="glass rounded-2xl p-5">
          <label className="block mb-2">
            <span className="text-lg mr-2">🏆</span>
            <span className="font-display font-semibold">What were your wins today?</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">Celebrate first. Every call, every email, every conversation counts.</p>
          <textarea value={wins} onChange={e => setWins(e.target.value)} rows={4}
            placeholder="e.g. Booked a meeting with Ahmed, finally got through to the CFO at TechCorp, sent 8 emails..."
            className="input resize-none w-full" />
        </div>

        {/* What was missed */}
        <div className="glass rounded-2xl p-5">
          <label className="block mb-2">
            <span className="text-lg mr-2">📋</span>
            <span className="font-display font-semibold">What didn't get done?</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">No judgment. Just log it so you don't forget tomorrow.</p>
          <textarea value={missed} onChange={e => setMissed(e.target.value)} rows={3}
            placeholder="e.g. Didn't follow up with Sara, forgot to send the proposal..."
            className="input resize-none w-full" />
        </div>

        {/* Tomorrow's intentions */}
        <div className="glass rounded-2xl p-5">
          <label className="block mb-2">
            <span className="text-lg mr-2">🎯</span>
            <span className="font-display font-semibold">Tomorrow's top 3 intentions</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">Set them now. Tomorrow's you will thank you.</p>
          <textarea value={tomorrow} onChange={e => setTomorrow(e.target.value)} rows={3}
            placeholder="1. Call back James at 10am&#10;2. Send proposal to TechCorp&#10;3. Follow up with 5 warm leads"
            className="input resize-none w-full" />
        </div>

        {/* Mood */}
        <div className="glass rounded-2xl p-5">
          <div className="font-display font-semibold mb-4">How do you feel about today?</div>
          <div className="flex gap-2 justify-between">
            {moods.map(m => (
              <button key={m.val} onClick={() => setMood(m.val)}
                className={`flex-1 py-3 rounded-xl text-center transition-all ${mood === m.val ? 'bg-cyan-500/20 border border-cyan-500/50' : 'glass hover:bg-white/5'}`}>
                <div className="text-2xl">{m.emoji}</div>
                <div className="text-xs text-gray-400 mt-1">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={save}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all text-base ${saved ? 'bg-green-500 text-white' : 'btn-primary'}`}>
          {saved ? <><CheckCircle size={20} /> Saved!</> : <><Save size={20} /> Save Review</>}
        </button>

        <p className="text-center text-xs text-gray-500">
          Great work today. Rest up and come back stronger. 💪
        </p>
      </div>
    </div>
  )
}
