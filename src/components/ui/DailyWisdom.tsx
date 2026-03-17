'use client'
import { useEffect, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'

interface Wisdom {
  quote: string
  attribution: string
  reflection: string
}

export default function DailyWisdom() {
  const [wisdom, setWisdom] = useState<Wisdom | null>(null)
  const [loading, setLoading] = useState(false)
  const [cached, setCached] = useState(false)

  useEffect(() => {
    // Check if we already fetched today's wisdom
    const today = new Date().toISOString().split('T')[0]
    const stored = localStorage.getItem('sse_wisdom')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.date === today) {
          setWisdom(parsed.wisdom)
          setCached(true)
          return
        }
      } catch {}
    }
    fetchWisdom()
  }, [])

  async function fetchWisdom() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daily_wisdom' }),
      })
      const data = await res.json()
      if (data.ok) {
        const w = JSON.parse(data.result)
        setWisdom(w)
        const today = new Date().toISOString().split('T')[0]
        localStorage.setItem('sse_wisdom', JSON.stringify({ date: today, wisdom: w }))
        setCached(false)
      }
    } catch (err) {
      console.error('Wisdom fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!wisdom && !loading) return null

  return (
    <div className="rounded-2xl p-5 border relative overflow-hidden" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-green)' }}>
      {/* Subtle green glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--brand-green), transparent)' }} />

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)' }}>
          <BookOpen size={14} style={{ color: 'var(--brand-green)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono" style={{ color: 'var(--brand-green)' }}>morning wisdom</span>
            <button
              onClick={fetchWisdom}
              disabled={loading}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Refresh quote"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 rounded animate-pulse" style={{ background: 'var(--surface-3)', width: '80%' }} />
              <div className="h-4 rounded animate-pulse" style={{ background: 'var(--surface-3)', width: '60%' }} />
            </div>
          ) : wisdom && (
            <>
              <blockquote className="text-sm text-white leading-relaxed italic mb-2">
                "{wisdom.quote}"
              </blockquote>
              <div className="text-xs text-gray-500 mb-2">— {wisdom.attribution}</div>
              <div className="text-xs text-gray-400 leading-relaxed" style={{ borderLeft: '2px solid var(--brand-green)', paddingLeft: '8px' }}>
                {wisdom.reflection}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
