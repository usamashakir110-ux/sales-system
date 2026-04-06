'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Campaign, Lead, LeadStatus, STATUS_COLORS } from '@/lib/types'
import { format, isPast, differenceInDays } from 'date-fns'
import {
  ArrowLeft, Plus, Search, Phone, Mail,
  Linkedin, Pin, Clock, ChevronRight, Upload, RefreshCw, Target
} from 'lucide-react'
import AddLeadModal from '@/components/modals/AddLeadModal'
import LeadDetailModal from '@/components/modals/LeadDetailModal'
import ImportCSVModal from '@/components/modals/ImportCSVModal'

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'warm', 'proposal', 'won', 'lost']

export default function SubCampaignPage() {
  const { id, subId } = useParams<{ id: string; subId: string }>()
  const router = useRouter()
  const [parent, setParent] = useState<Campaign | null>(null)
  const [subCampaign, setSubCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [showAddLead, setShowAddLead] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { loadData() }, [subId])

  async function loadData() {
    const [{ data: p }, { data: s }, { data: l }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('campaigns').select('*').eq('id', subId).single(),
      supabase.from('leads').select('*').eq('campaign_id', subId)
        .order('is_pinned', { ascending: false })
        .order('score', { ascending: false }),
    ])
    if (p) setParent(p)
    if (s) setSubCampaign(s)
    if (l) setLeads(l)
  }

  async function syncSheets() {
    setSyncing(true)
    await fetch('/api/sheets-sync', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: subId }),
      headers: { 'Content-Type': 'application/json' }
    })
    await loadData()
    setSyncing(false)
  }

  const filtered = leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  function getStaleWarning(lead: Lead) {
    if (!lead.last_contacted_at) return null
    const days = differenceInDays(new Date(), new Date(lead.last_contacted_at))
    if (days > 14) return `${days}d stale`
    return null
  }

  const progress = subCampaign && subCampaign.goal_target > 0
    ? Math.min((subCampaign.goal_current / subCampaign.goal_target) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-[#080c12]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 md:px-6 py-4 sticky top-0 z-30 bg-[#080c12]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <button onClick={() => router.push('/')} className="hover:text-gray-300 transition-colors">Dashboard</button>
            <ChevronRight size={12} />
            <button onClick={() => router.push(`/campaigns/${id}`)} className="hover:text-gray-300 transition-colors">
              {parent?.name ?? '...'}
            </button>
            <ChevronRight size={12} />
            <span className="text-gray-300">{subCampaign?.name ?? '...'}</span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.push(`/campaigns/${id}`)} className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            {subCampaign && (
              <>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parent?.color ?? subCampaign.color }} />
                <div>
                  <h1 className="font-display font-bold text-xl">{subCampaign.name}</h1>
                  {subCampaign.description && (
                    <p className="text-xs text-gray-400">{subCampaign.description}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {subCampaign && subCampaign.goal_target > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="flex items-center gap-1"><Target size={12} /> {subCampaign.goal_type} goal</span>
                <span className="font-medium text-white">{subCampaign.goal_current} / {subCampaign.goal_target}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full progress-bar"
                  style={{ width: `${progress}%`, backgroundColor: parent?.color ?? '#f97316' }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..." className="input pl-8 py-1.5 text-xs" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="input text-xs py-1.5 w-auto">
              <option value="all">All Status</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button onClick={() => setShowImport(true)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
              <Upload size={13} /> Import CSV
            </button>
            <button onClick={syncSheets} disabled={syncing} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Sync Sheets
            </button>
            <button onClick={() => setShowAddLead(true)} className="btn-primary flex items-center gap-1.5 text-xs py-1.5">
              <Plus size={13} /> Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Lead table */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {/* Status summary pills */}
        <div className="flex gap-2 flex-wrap mb-4">
          {STATUS_ORDER.map(s => {
            const count = leads.filter(l => l.status === s).length
            if (count === 0) return null
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`badge cursor-pointer transition-all ${STATUS_COLORS[s]} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-offset-[#0a0a0f]' : 'opacity-70 hover:opacity-100'}`}>
                {s} <span className="font-bold">{count}</span>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="text-gray-400 mb-4">No leads yet. Add your first lead to get started.</p>
            <button onClick={() => setShowAddLead(true)} className="btn-primary">Add Lead</button>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-[var(--border)] text-xs text-gray-500 font-medium uppercase tracking-wide">
              <div className="col-span-3">Lead</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2">Last Action</div>
              <div className="col-span-2">Next Contact</div>
              <div className="col-span-1 text-center">Outreach</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {filtered.map(lead => {
                const stale = getStaleWarning(lead)
                const overdue = lead.next_contact_date && isPast(new Date(lead.next_contact_date)) && lead.status !== 'won' && lead.status !== 'lost'
                const displayScore = lead.score_override ?? lead.score

                return (
                  <div key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer group">

                    <div className="col-span-3 flex items-center gap-2">
                      {lead.is_pinned && <Pin size={12} className="text-cyan-400 flex-shrink-0" />}
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {lead.name}
                          {stale && <span className="text-xs text-red-400 font-normal">({stale})</span>}
                        </div>
                        <div className="text-xs text-gray-400">{lead.company}</div>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <span className={`badge text-xs ${STATUS_COLORS[lead.status as LeadStatus]}`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-center">
                      <div className={`font-display font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center
                        ${displayScore >= 8 ? 'bg-green-500/20 text-green-400' : displayScore >= 6 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {displayScore}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center text-xs text-gray-400">
                      {lead.last_contacted_at ? format(new Date(lead.last_contacted_at), 'MMM d') : '—'}
                    </div>

                    <div className="col-span-2 flex items-center">
                      {lead.next_contact_date ? (
                        <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                          {overdue ? '⚠ ' : ''}{format(new Date(lead.next_contact_date), 'MMM d')}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </div>

                    <div className="col-span-1 flex items-center justify-center gap-1">
                      {lead.phone && <Phone size={12} className="text-gray-500" />}
                      {lead.email && <Mail size={12} className="text-gray-500" />}
                      {lead.linkedin_url && <Linkedin size={12} className="text-gray-500" />}
                    </div>

                    <div className="col-span-1 hidden md:flex items-center justify-end">
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showAddLead && (
        <AddLeadModal campaignId={subId} onClose={() => setShowAddLead(false)} onCreated={() => { setShowAddLead(false); loadData() }} />
      )}
      {showImport && (
        <ImportCSVModal campaignId={subId} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); loadData() }} />
      )}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => { setSelectedLead(null); loadData() }}
        />
      )}
    </div>
  )
}
