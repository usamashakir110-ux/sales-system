'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onCreated: () => void }

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#f59e0b']

export default function NewCampaignModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState('calls')
  const [goalTarget, setGoalTarget] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        goal_type: goalType,
        goal_target: goalTarget ? parseInt(goalTarget) : 0,
        goal_current: 0,
        color,
        is_active: true,
      })
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create campaign')
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Campaign Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="e.g. Q3 SaaS Outreach, Dubai SMB Campaign"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input"
              placeholder="Target market, product, notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Goal Type</label>
              <select value={goalType} onChange={e => setGoalType(e.target.value)} className="input">
                <option value="calls">Calls</option>
                <option value="deals">Deals</option>
                <option value="meetings">Meetings</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Number</label>
              <input
                type="number"
                value={goalTarget}
                onChange={e => setGoalTarget(e.target.value)}
                className="input"
                placeholder="e.g. 50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Campaign Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#13131a] scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={create}
            disabled={!name.trim() || saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}
