'use client'
import { useState } from 'react'
import { X, Sparkles, Mail, Linkedin, Zap, BarChart2, Loader2, Copy, Check } from 'lucide-react'
import { Lead, Campaign, Touchpoint } from '@/lib/types'

interface Props {
  lead: Lead
  campaign: Campaign
  touchpoints: Touchpoint[]
  onClose: () => void
}

type AIAction = 'draft_email' | 'linkedin_message' | 'followup_suggest' | 'pipeline_analysis'

interface FollowupResult {
  nextAction: string
  channel: string
  timing: string
  reasoning: string
  messageHint: string
}

export default function AIAssistantModal({ lead, campaign, touchpoints, onClose }: Props) {
  const [activeAction, setActiveAction] = useState<AIAction | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [followup, setFollowup] = useState<FollowupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function runAction(action: AIAction) {
    setActiveAction(action)
    setLoading(true)
    setResult(null)
    setFollowup(null)
    setError(null)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lead, campaign, touchpoints }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI request failed')

      if (action === 'followup_suggest') {
        setFollowup(JSON.parse(data.result))
      } else {
        setResult(data.result)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    const text = result || (followup ? `${followup.nextAction}\n\nChannel: ${followup.channel}\nTiming: ${followup.timing}\nOpening: ${followup.messageHint}` : '')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const actions = [
    { id: 'draft_email' as AIAction, label: 'Draft Email', icon: Mail, color: 'text-cyan-400', desc: 'Ready-to-send cold or follow-up email' },
    { id: 'linkedin_message' as AIAction, label: 'LinkedIn Message', icon: Linkedin, color: 'text-blue-400', desc: 'Short personalised LinkedIn outreach' },
    { id: 'followup_suggest' as AIAction, label: 'What to do next?', icon: Zap, color: 'text-emerald-400', desc: 'AI analyses history and recommends next move' },
    { id: 'pipeline_analysis' as AIAction, label: 'Pipeline Analysis', icon: BarChart2, color: 'text-purple-400', desc: 'Full pipeline health check and call list' },
  ]

  const CHANNEL_ICONS: Record<string, string> = {
    call: '📞', email: '✉️', linkedin: '💼', message: '💬'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border-bright)', boxShadow: '0 0 60px rgba(0,212,255,0.1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00d4ff22, #00ff9d22)', border: '1px solid #00d4ff44' }}>
              <Sparkles size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <div className="font-display font-semibold text-sm">AI Assistant</div>
              <div className="text-xs text-gray-500">{lead.name} · {campaign.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => runAction(a.id)}
              disabled={loading}
              className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all border ${activeAction === a.id ? 'border-cyan-500/50' : 'border-transparent'}`}
              style={{
                background: activeAction === a.id ? 'rgba(0,212,255,0.08)' : 'var(--surface-2)',
              }}
            >
              <a.icon size={16} className={`${a.color} mt-0.5 shrink-0`} />
              <div>
                <div className="text-sm font-medium text-white">{a.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Result area */}
        <div className="p-4 min-h-[200px]">
          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
              <div className="text-sm text-gray-400">Claude is thinking...</div>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <strong>Error:</strong> {error}
              {error.includes('credit') || error.includes('quota') || error.includes('API key') ? (
                <div className="mt-2 text-xs text-red-300">Add credits at console.anthropic.com → Billing</div>
              ) : null}
            </div>
          )}

          {result && !loading && (
            <div>
              <div className="rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-mono text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {result}
              </div>
              <button
                onClick={copyResult}
                className="mt-3 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--surface-3)', color: copied ? 'var(--brand-green)' : 'var(--brand)' }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          )}

          {followup && !loading && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 border" style={{ background: 'rgba(0,255,157,0.05)', borderColor: 'rgba(0,255,157,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{CHANNEL_ICONS[followup.channel] || '📌'}</span>
                  <span className="font-semibold text-white">{followup.nextAction}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mb-3">
                  <span>Channel: <span className="text-cyan-400">{followup.channel}</span></span>
                  <span>When: <span className="text-emerald-400">{followup.timing}</span></span>
                </div>
                <div className="text-xs text-gray-400 mb-2">{followup.reasoning}</div>
                {followup.messageHint && (
                  <div className="rounded-lg p-3 text-xs italic text-gray-300" style={{ background: 'var(--surface-3)' }}>
                    "{followup.messageHint}"
                  </div>
                )}
              </div>
              <button
                onClick={copyResult}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--surface-3)', color: copied ? 'var(--brand-green)' : 'var(--brand)' }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy recommendation'}
              </button>
            </div>
          )}

          {!loading && !result && !followup && !error && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-600">
              <Sparkles size={24} />
              <div className="text-sm">Pick an action above to get started</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
