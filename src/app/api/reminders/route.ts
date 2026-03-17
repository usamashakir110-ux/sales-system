import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST: schedule callback reminders
export async function POST(req: NextRequest) {
  const { lead_id, lead_name, callback_at } = await req.json()
  const callbackDate = new Date(callback_at)
  const now = new Date()
  const diffMs = callbackDate.getTime() - now.getTime()

  const tenMinBefore = diffMs - 10 * 60 * 1000
  const twoMinBefore = diffMs - 2 * 60 * 1000

  // Schedule browser notification triggers via tasks
  const db = supabaseAdmin()
  if (tenMinBefore > 0) {
    await db.from('tasks').insert({
      lead_id,
      title: `📞 CALL IN 10 MIN — ${lead_name}`,
      due_at: new Date(now.getTime() + tenMinBefore).toISOString(),
      priority: 'high',
      is_pinned: true,
    })
  }
  if (twoMinBefore > 0) {
    await db.from('tasks').insert({
      lead_id,
      title: `🚨 CALL IN 2 MIN — ${lead_name}`,
      due_at: new Date(now.getTime() + twoMinBefore).toISOString(),
      priority: 'high',
      is_pinned: true,
    })
  }

  return NextResponse.json({ ok: true })
}

// PATCH: award XP and update streak
export async function PATCH(req: NextRequest) {
  const { action, amount } = await req.json()
  const db = supabaseAdmin()

  if (action === 'xp') {
    const { data: stats } = await db.from('user_stats').select('*').single()
    if (!stats) return NextResponse.json({ ok: false })

    const today = new Date().toISOString().split('T')[0]
    const lastDate = stats.last_activity_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newStreak = stats.streak_days
    let multiplier = stats.streak_multiplier

    if (lastDate !== today) {
      if (lastDate === yesterday) {
        newStreak = stats.streak_days + 1
      } else if (!lastDate) {
        newStreak = 1
      } else {
        // Streak broken
        newStreak = 1
        multiplier = 1.0
      }
      // Hot streak multiplier
      if (newStreak >= 3 && newStreak % 3 === 0) {
        multiplier = Math.min(3.0, multiplier + 0.5)
      }
    }

    const newXP = stats.total_xp + amount
    const newLevel = calcLevel(newXP)

    await db.from('user_stats').update({
      total_xp: newXP,
      level: newLevel,
      streak_days: newStreak,
      streak_multiplier: multiplier,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    }).eq('id', stats.id)

    return NextResponse.json({ ok: true, newXP, newLevel, newStreak })
  }

  return NextResponse.json({ ok: false })
}

// GET: check for due reminders (called by client polling)
export async function GET(req: NextRequest) {
  const db = supabaseAdmin()
  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

  const { data: dueTasks } = await db
    .from('tasks')
    .select('*, lead:leads(name, score, score_override)')
    .eq('is_done', false)
    .lte('due_at', now.toISOString())
    .gte('due_at', fiveMinAgo)

  // Send email for high-priority overdue items
  const highPriority = (dueTasks || []).filter((t: any) => t.priority === 'high' || t.is_pinned)

  if (highPriority.length > 0 && process.env.REMINDER_EMAIL) {
    const taskList = highPriority.map((t: any) => `• ${t.title}`).join('\n')
    await resend.emails.send({
      from: 'SSE — Shakir's Sales Engine <reminders@resend.dev>',
      to: process.env.REMINDER_EMAIL,
      subject: `🚨 ${highPriority.length} urgent reminder${highPriority.length > 1 ? 's' : ''} — SSE — Shakir's Sales Engine`,
      text: `You have urgent items due right now:\n\n${taskList}\n\nOpen SSE — Shakir's Sales Engine to take action.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #f97316; margin: 0 0 16px;">🚨 Urgent Reminders</h2>
          <p style="color: #666; margin-bottom: 16px;">You have <strong>${highPriority.length}</strong> high-priority item${highPriority.length > 1 ? 's' : ''} due now:</p>
          <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            ${highPriority.map((t: any) => `<p style="margin: 6px 0; font-weight: 600;">📌 ${t.title}</p>`).join('')}
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/daily" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Open Daily Focus →
          </a>
        </div>
      `
    }).catch(console.error)
  }

  return NextResponse.json({ tasks: dueTasks || [] })
}

function calcLevel(xp: number): number {
  const thresholds = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000, 7500]
  let level = 1
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) { level = i + 1; break }
  }
  return level
}
