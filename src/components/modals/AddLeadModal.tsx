'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

interface Props { campaignId: string; onClose: () => void; onCreated: () => void }

export default function AddLeadModal({ campaignId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', linkedin_url: '',
    priority: 'medium', notes: ''
  })
  const [saving, setSaving] = useState(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('leads').insert({
      ...form, campaign_id: campaignId,
      status: 'new', score: 5, cadence_day: 1,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-[#13131a] border border-[var(--border)] rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)] sticky top-0 bg-[#13131a]">
          <h2 className="font-display font-bold text-xl">Add Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Full Name *</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="Ahmed Al-Rashid" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Company</label>
            <input value={form.company} onChange={e => update('company', e.target.value)} className="input" placeholder="Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input value={form.phone} onChange={e => update('phone', e.target.value)} className="input" placeholder="+971..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Email</label>
              <input value={form.email} onChange={e => update('email', e.target.value)} className="input" placeholder="name@co.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">LinkedIn URL</label>
            <input value={form.linkedin_url} onChange={e => update('linkedin_url', e.target.value)} className="input" placeholder="linkedin.com/in/..." />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Priority</label>
            <select value={form.priority} onChange={e => update('priority', e.target.value)} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
              rows={2} className="input resize-none" placeholder="Key info, context, where you met them..." />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={create} disabled={!form.name.trim() || saving} className="btn-primary flex-1">
            {saving ? 'Adding...' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
