'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Template, OutreachChannel, CHANNEL_COLORS } from '@/lib/types'
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import Link from 'next/link'

const CHANNELS: OutreachChannel[] = ['call', 'email', 'message', 'linkedin']

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeChannel, setActiveChannel] = useState<OutreachChannel>('call')
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data } = await supabase.from('templates').select('*').order('channel').order('created_at')
    if (data) setTemplates(data)
  }

  async function saveEdit() {
    if (!editing) return
    await supabase.from('templates').update({ name: editing.name, content: editing.content }).eq('id', editing.id)
    setEditing(null); loadTemplates()
  }

  async function createTemplate() {
    if (!newName.trim() || !newContent.trim()) return
    await supabase.from('templates').insert({ channel: activeChannel, name: newName, content: newContent })
    setCreating(false); setNewName(''); setNewContent(''); loadTemplates()
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    await supabase.from('templates').delete().eq('id', id)
    loadTemplates()
  }

  const filtered = templates.filter(t => t.channel === activeChannel)

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
            <h1 className="font-display font-bold text-lg">Outreach Templates</h1>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Channel tabs */}
        <div className="flex gap-2 mb-5">
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => setActiveChannel(ch)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all
                ${activeChannel === ch ? 'bg-orange-500 text-white' : 'glass text-gray-400 hover:text-white'}`}>
              {ch === 'linkedin' ? 'LinkedIn' : ch}
              <span className="ml-1.5 text-xs opacity-70">({templates.filter(t => t.channel === ch).length})</span>
            </button>
          ))}
        </div>

        {/* Create form */}
        {creating && (
          <div className="glass rounded-2xl p-5 mb-4 border border-orange-500/30">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm">New {activeChannel} template</p>
              <button onClick={() => setCreating(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Template name" className="input mb-2 text-sm" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="Template content. Use [Name], [Company], [Your Name] as placeholders."
              rows={5} className="input resize-none mb-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="btn-ghost text-xs">Cancel</button>
              <button onClick={createTemplate} className="btn-primary text-xs">Save Template</button>
            </div>
          </div>
        )}

        {/* Templates list */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-gray-400 mb-3">No {activeChannel} templates yet.</p>
            <button onClick={() => setCreating(true)} className="btn-primary text-sm">Create First Template</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tmpl => (
              <div key={tmpl.id} className="glass rounded-2xl p-5">
                {editing?.id === tmpl.id ? (
                  <>
                    <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                      className="input mb-2 text-sm" />
                    <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })}
                      rows={6} className="input resize-none mb-3 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="btn-ghost text-xs">Cancel</button>
                      <button onClick={saveEdit} className="btn-primary text-xs flex items-center gap-1">
                        <Save size={13} /> Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`badge ${CHANNEL_COLORS[tmpl.channel as OutreachChannel]} mr-2`}>{tmpl.channel}</span>
                        <span className="font-medium text-sm">{tmpl.name}</span>
                      </div>
                      <div className="flex gap-1.5 ml-2">
                        <button onClick={() => setEditing(tmpl)} className="text-gray-500 hover:text-white transition-colors p-1">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteTemplate(tmpl.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{tmpl.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
