'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Campaign } from '@/lib/types'
import {
  ArrowLeft, Plus, ChevronRight, Target, Trash2, Users, Trophy
} from 'lucide-react'
import NewCampaignModal from '@/components/modals/NewCampaignModal'

export default function CampaignOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [parent, setParent] = useState<Campaign | null>(null)
  const [subCampaigns, setSubCampaigns] = useState<Campaign[]>([])
  const [leadCounts, setLeadCounts] = useState<Record<string, { total: number; won: number }>>({})
  const [showNewSub, setShowNewSub] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: p }, { data: subs }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('campaigns').select('*').eq('parent_campaign_id', id).order('created_at', { ascending: true }),
    ])
    if (p) setParent(p)
    if (subs && subs.length > 0) {
      const subIds = subs.map((s: Campaign) => s.id)
      const { data: leads } = await supabase
        .from('leads')
        .select('campaign_id, status')
        .in('campaign_id', subIds)

      const counts: Record<string, { total: number; won: number }> = {}
      subIds.forEach((sid: string) => { counts[sid] = { total: 0, won: 0 } })
      leads?.forEach((l: any) => {
        counts[l.campaign_id].total++
        if (l.status === 'won') counts[l.campaign_id].won++
      })
      setLeadCounts(counts)
      setSubCampaigns(subs)
    } else {
      setSubCampaigns([])
    }
  }

  async function deleteSubCampaign(e: React.MouseEvent, subId: string, subName: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${subName}"? All leads inside will be deleted too. This cannot be undone.`)) return
    await supabase.from('leads').delete().eq('campaign_id', subId)
    await supabase.from('campaigns').delete().eq('id', subId)
    setSubCampaigns(prev => prev.filter(s => s.id !== subId))
  }

  // Total rollup across all sub-campaigns
  const totalLeads = Object.values(leadCounts).reduce((a, c) => a + c.total, 0)
  const totalWon = Object.values(leadCounts).reduce((a, c) => a + c.won, 0)

  return (
    <div className="min-h-screen bg-[#080c12]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 md:px-6 py-4 sticky top-0 z-30 bg-[#080c12]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            {parent && (
              <>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parent.color }} />
                <h1 className="font-display font-bold text-xl">{parent.name}</h1>
              </>
            )}
          </div>
          {parent?.description && (
            <p className="text-sm text-gray-400 ml-9">{parent.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Rollup stats */}
        {subCampaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="font-display font-bold text-2xl">{subCampaigns.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">Sub-campaigns</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="font-display font-bold text-2xl flex items-center justify-center gap-1.5">
                <Users size={18} className="text-cyan-400" />{totalLeads}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Total Leads</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="font-display font-bold text-2xl flex items-center justify-center gap-1.5">
                <Trophy size={18} className="text-green-400" />{totalWon}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Won</div>
            </div>
          </div>
        )}

        {/* Sub-campaigns list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Sub-campaigns</h2>
            <button onClick={() => setShowNewSub(true)} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> New Sub-campaign
            </button>
          </div>

          {subCampaigns.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <Target size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">
                No sub-campaigns yet. Create one for each trade or segment.
              </p>
              <button onClick={() => setShowNewSub(true)} className="btn-primary">
                Create Sub-campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subCampaigns.map(sub => {
                const counts = leadCounts[sub.id] ?? { total: 0, won: 0 }
                const winRate = counts.total > 0 ? Math.round((counts.won / counts.total) * 100) : 0
                return (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/campaigns/${id}/${sub.id}`)}
                    className="glass rounded-2xl p-5 hover:bg-white/5 transition-all group cursor-pointer relative"
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteSubCampaign(e, sub.id, sub.name)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete sub-campaign"
                    >
                      <Trash2 size={13} />
                    </button>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: parent?.color ?? sub.color }} />
                      <div>
                        <h3 className="font-display font-semibold">{sub.name}</h3>
                        {sub.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{sub.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Users size={12} />
                          <span className="font-medium text-white">{counts.total}</span> leads
                        </span>
                        {counts.won > 0 && (
                          <span className="text-green-400 flex items-center gap-1">
                            <Trophy size={12} />
                            <span className="font-medium">{counts.won}</span> won
                          </span>
                        )}
                      </div>
                      <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
                    </div>

                    {counts.total > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${winRate}%`, backgroundColor: parent?.color ?? '#00d4ff' }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{winRate}% win rate</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showNewSub && parent && (
        <NewCampaignModal
          parentCampaignId={id}
          defaultColor={parent.color}
          onClose={() => setShowNewSub(false)}
          onCreated={() => { setShowNewSub(false); loadData() }}
        />
      )}
    </div>
  )
}
