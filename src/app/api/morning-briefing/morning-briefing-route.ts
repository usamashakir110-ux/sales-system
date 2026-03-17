import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // Get today's tasks
  const { data: tasks } = await db
    .from('tasks')
    .select('*, lead:leads(name, company)')
    .eq('is_done', false)
    .lte('due_at', `${today}T23:59:59`)
    .order('due_at')

  // Get high-score leads (7+) due for contact today
  const { data: hotLeads } = await db
    .from('leads')
    .select('*')
    .not('status', 'in', '(won,lost)')
    .lte('next_contact_date', today)
    .gte('score', 7)
    .order('score', { ascending: false })
    .limit(10)

  // Get callbacks today
  const { data: callbacks } = await db
    .from('leads')
    .select('*')
    .gte('scheduled_callback_at', `${today}T00:00:00`)
    .lte('scheduled_callback_at', `${today}T23:59:59`)
    .order('scheduled_callback_at')

  // Get stats
  const { data: stats } = await db.from('user_stats').select('*').single()

  if (!process.env.REMINDER_EMAIL) return NextResponse.json({ ok: false, reason: 'No email configured' })

  const tasksList = (tasks || []).slice(0, 8).map((t: any) =>
    `<li style="margin: 6px 0;"><strong>${t.title}</strong>${t.lead ? ` — ${t.lead.name}` : ''}</li>`
  ).join('')

  const hotLeadsList = (hotLeads || []).slice(0, 5).map((l: any) =>
    `<li style="margin: 6px 0;"><strong>${l.name}</strong> at ${l.company} (Score: ${l.score_override ?? l.score})</li>`
  ).join('')

  const callbacksList = (callbacks || []).map((l: any) =>
    `<li style="margin: 6px 0;"><strong>${l.name}</strong> — ${format(new Date(l.scheduled_callback_at), 'h:mm a')}</li>`
  ).join('')

  await resend.emails.send({
    from: 'SSE <morning@resend.dev>',
    to: process.env.REMINDER_EMAIL,
    subject: `☀️ Good morning, Usama — Your SSE briefing for ${format(new Date(), 'EEEE, MMMM d')}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #080c12; color: #e5e7eb; border-radius: 16px;">
        <h1 style="color: #00d4ff; font-size: 24px; margin: 0 0 8px;">☀️ Morning Briefing</h1>
        <p style="color: #9ca3af; margin: 0 0 24px;">${format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

        ${stats ? `
        <div style="background: #0d1117; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; gap: 24px;">
          <div><div style="color: #00d4ff; font-size: 24px; font-weight: bold;">${stats.streak_days}</div><div style="color: #9ca3af; font-size: 12px;">🔥 day streak</div></div>
          <div><div style="color: #00d4ff; font-size: 24px; font-weight: bold;">${stats.total_xp.toLocaleString()}</div><div style="color: #9ca3af; font-size: 12px;">⚡ XP</div></div>
          ${stats.streak_multiplier > 1 ? `<div><div style="color: #34d399; font-size: 24px; font-weight: bold;">${stats.streak_multiplier}x</div><div style="color: #9ca3af; font-size: 12px;">XP multiplier</div></div>` : ''}
        </div>` : ''}

        ${callbacks && callbacks.length > 0 ? `
        <h2 style="color: #ef4444; font-size: 16px; margin: 0 0 8px;">🚨 Scheduled Callbacks Today</h2>
        <ul style="margin: 0 0 20px; padding-left: 20px;">${callbacksList}</ul>` : ''}

        ${hotLeads && hotLeads.length > 0 ? `
        <h2 style="color: #00d4ff; font-size: 16px; margin: 0 0 8px;">🔥 Hot Leads to Contact</h2>
        <ul style="margin: 0 0 20px; padding-left: 20px;">${hotLeadsList}</ul>` : ''}

        ${tasks && tasks.length > 0 ? `
        <h2 style="color: #60a5fa; font-size: 16px; margin: 0 0 8px;">📋 Tasks Due Today</h2>
        <ul style="margin: 0 0 20px; padding-left: 20px;">${tasksList}</ul>` : ''}

        <div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 8px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/daily" style="background: #00d4ff; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
            Open Daily Focus →
          </a>
          <p style="color: #4b5563; font-size: 12px; margin-top: 16px;">Let's get it, Usama. Today is yours. 💪</p>
        </div>
      </div>
    `
  })

  return NextResponse.json({ ok: true })
}
