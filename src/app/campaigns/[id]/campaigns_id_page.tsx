'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Campaign, Lead, LeadStatus, STATUS_COLORS } from '@/lib/types'
import { format, isPast, differenceInDays } from 'date-fns'
import {
  ArrowLeft, Plus, Search, Phone, Mail,
  Linkedin, Pin, ChevronRight, Upload, RefreshCw,
  Target, Layers, Trash2
} from 'lucide-react'
import AddLeadModal from '@/components/modals/AddLeadModal'
import LeadDetailModal from '@/components/modals/LeadDetailModal'
import ImportCSVModal from '@/components/modals/ImportCSVModal'
import NewCampaignModal from '@/components/modals/NewCampaignModal'
import Link from 'next/link'

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'warm', 'proposal', 'won', 'lost']

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [subCampaigns, setSubCampaigns] = useState<Campaign[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [showAddLead, setShowAddLead] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showNewSub, setShowNewSub] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'leads' | 'subcampaigns'>('leads')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: c }, { data: l }, { data: sub }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('leads').select('*').eq('campaign_id', id)
        .order('is_pinned', { ascending: false })
        .order('score', { ascending: false }),
      supabase.from('campaigns').select('*').eq('parent_campaign_id', id).eq('is_active', true),
    ])
    if (c) setCampaign(c)
    if (l) setLeads(l)
    if (sub) setSubCampaigns(sub)
  }

  async function syncSheets() {
    setSyncing(true)
    await fetch('/api/sheets-sync', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: id }),
      headers: { 'Content-Type': 'application/json' }
    })
    await loadData()
    setSyncing(false)
  }

  async function deleteSubCampaign(e: React.MouseEvent, subId: string, subName: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${subName}"? This will also delete all leads inside it.`)) return
    await supabase.from('leads').delete().eq('campaign_id', subId)
    await supabase.from('campaigns').delete().eq('id', subId)
    setSubCampaigns(prev => prev.filter(s => s.id !== subId))
  }

  const filtered = leads.filter(l => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
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

  const progress = campaign && campaign.goal_target > 0
    ? Math.min((campaign.goal_current / campaign.goal_target) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-[#080c12]">

      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 md:px-6 py-4 sticky top-0 z-30 bg-[#080c12]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-gray-300">{campaign?.name ?? '...'}</span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            {campaign && (
              <>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: campaign.color }} />
                <div>
                  <h1 className="font-display font-bold text-xl">{campaign.name}</h1>
                  {campaign.description && (
                    <p className="text-xs text-gray-400">{campaign.description}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {campaign && campaign.goal_target > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="flex items-center gap-1"><Target size={12} /> {campaign.goal_type} goal</span>
                <span className="font-medium text-white">{campaign.goal_current} / {campaign.goal_target}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, backgroundColor: campaign.color }} />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-[var(--border)] -mb-4">
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-cyan-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              Leads <span className="ml-1 text-xs text-gray-500">{leads.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('subcampaigns')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'subcampaigns' ? 'border-cyan-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Layers size={13} /> Sub-Campaigns <span className="ml-1 text-xs text-gray-500">{subCampaigns.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">

        {/* ── LEADS TAB ── */}
        {activeTab === 'leads' && (
          <>
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search leads..." className="input pl-8 py-1.5 text-xs" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                className="input text-xs py-1.5 w-auto">
                <option value="all">All Status</option>
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
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

            <div className="flex gap-2 flex-wrap mb-4">
              {STATUS_ORDER.map(s => {
                const count = leads.filter(l => l.status === s).length
                if (count === 0) return null
                return (
                  <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                    className={`badge cursor-pointer transition-all ${STATUS_COLORS[s]} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-offset-[#0a0a0f]' : 'opacity-70 hover:opacity-100'}`}>
                    {s} <span className="font-bold ml-1">{count}</span>
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
                    const overdue = lead.next_contact_date &&
                      isPast(new Date(lead.next_contact_date)) &&
                      lead.status !== 'won' && lead.status !== 'lost'
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
          </>
        )}

        {/* ── SUB-CAMPAIGNS TAB ── */}
        {activeTab === 'subcampaigns' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Break this campaign into focused sub-campaigns.</p>
              <button onClick={() => setShowNewSub(true)} className="btn-primary flex items-center gap-1.5 text-xs py-1.5">
                <Plus size={13} /> New Sub-Campaign
              </button>
            </div>

            {subCampaigns.length === 0 ? (
              <div className="glass rounded-2xl p-16 text-center">
                <Layers size={36} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No sub-campaigns yet.</p>
                <button onClick={() => setShowNewSub(true)} className="btn-primary">Create Sub-Campaign</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subCampaigns.map(sub => {
                  const subProgress = sub.goal_target > 0
                    ? Math.min((sub.goal_current / sub.goal_target) * 100, 100) : 0
                  return (
                    <Link key={sub.id} href={`/campaigns/${id}/${sub.id}`}
                      className="glass rounded-2xl p-5 hover:bg-white/5 transition-all group block">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ backgroundColor: campaign?.color ?? sub.color }} />
                          <h3 className="font-display font-semibold">{sub.name}</h3>
                          {sub.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sub.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => deleteSubCampaign(e, sub.id, sub.name)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete sub-campaign">
                            <Trash2 size={13} />
                          </button>
                          <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 mt-1 transition-colors" />
                        </div>
                      </div>
                      {sub.goal_target > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                            <span>{sub.goal_type} goal</span>
                            <span className="font-medium text-white">{sub.goal_current}/{sub.goal_target}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${subProgress}%`, backgroundColor: campaign?.color ?? sub.color }} />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{Math.round(subProgress)}% complete</div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showAddLead && (
        <AddLeadModal campaignId={id} onClose={() => setShowAddLead(false)}
          onCreated={() => { setShowAddLead(false); loadData() }} />
      )}
      {showImport && (
        <ImportCSVModal campaignId={id} onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadData() }} />
      )}
      {showNewSub && (
        <NewCampaignModal
          parentCampaignId={id}
          onClose={() => setShowNewSub(false)}
          onCreated={() => { setShowNewSub(false); loadData() }}
        />
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
