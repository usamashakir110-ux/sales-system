import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const { campaign_id } = await req.json()
  const db = supabaseAdmin()

  const { data: campaign } = await db.from('campaigns').select('*').eq('id', campaign_id).single()
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Count won deals for this campaign
  const { count } = await db.from('leads').select('id', { count: 'exact' })
    .eq('campaign_id', campaign_id).eq('status', 'won')

  await db.from('campaigns').update({ goal_current: count || 0 }).eq('id', campaign_id)

  // Update weekly deals stat
  const { data: stats } = await db.from('user_stats').select('*').single()
  if (stats) {
    await db.from('user_stats').update({ weekly_deals: (stats.weekly_deals || 0) + 1 }).eq('id', stats.id)
  }

  return NextResponse.json({ ok: true, goal_current: count })
}
