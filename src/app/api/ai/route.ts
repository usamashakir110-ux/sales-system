import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Campaign identity map — each campaign has its own persona, voice, and context
const CAMPAIGN_IDENTITIES: Record<string, {
  persona: string
  company: string
  role: string
  industry: string
  tone: string
  services: string
  senderName: string
  senderEmail: string
}> = {
  maddox360: {
    persona: 'Usama Shakir',
    company: 'Maddox360',
    role: 'Digital Growth Consultant',
    industry: 'Healthcare digital marketing, web development, appointment setting, front office solutions, and medical billing',
    tone: 'professional yet warm, consultative, focused on ROI for medical practices',
    services: 'digital marketing, website development, appointment setting, front office management, and medical billing for doctors and clinicians',
    senderName: 'Usama Shakir',
    senderEmail: 'usama@maddox360.net',
  },
  soundself: {
    persona: 'Mark Hanson',
    company: 'SoundSelf',
    role: 'Outreach Specialist',
    industry: 'Wellness technology, immersive sound experiences',
    tone: 'friendly, curious, wellness-focused, non-pushy',
    services: 'SoundSelf — a transformative wellness and sound meditation technology',
    senderName: 'Mark Hanson',
    senderEmail: 'mark@soundself.com',
  },
  bidcrafters: {
    persona: 'Usama Shakir',
    company: 'Bid Crafters',
    role: 'Sales Representative',
    industry: 'Bid writing, proposal crafting, tender management',
    tone: 'sharp, results-driven, focused on winning contracts',
    services: 'professional bid writing, tender management, and proposal crafting services',
    senderName: 'Usama Shakir',
    senderEmail: 'usama@bidcrafters.com',
  },
}

// Detect campaign identity from campaign name
function getCampaignIdentity(campaignName: string) {
  const name = campaignName.toLowerCase()
  if (name.includes('maddox') || name.includes('360') || name.includes('medical') || name.includes('doctor') || name.includes('clinic')) {
    return CAMPAIGN_IDENTITIES.maddox360
  }
  if (name.includes('sound') || name.includes('self') || name.includes('mark') || name.includes('hanson')) {
    return CAMPAIGN_IDENTITIES.soundself
  }
  if (name.includes('bid') || name.includes('craft') || name.includes('tender') || name.includes('proposal')) {
    return CAMPAIGN_IDENTITIES.bidcrafters
  }
  // Default — generic Usama identity
  return {
    persona: 'Usama Shakir',
    company: campaignName,
    role: 'Sales Professional',
    industry: 'General sales',
    tone: 'professional, confident, and direct',
    services: 'professional services',
    senderName: 'Usama Shakir',
    senderEmail: 'usama@shakir.com',
  }
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

export async function POST(req: NextRequest) {
  const { action, lead, campaign, touchpoints, reviewData } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const identity = campaign ? getCampaignIdentity(campaign.name) : CAMPAIGN_IDENTITIES.maddox360
  const touchpointSummary = touchpoints?.length
    ? touchpoints.map((t: any) => `- ${t.channel} on ${new Date(t.created_at).toLocaleDateString('en-US', {timeZone: 'America/New_York'})}: ${t.outcome || 'no outcome noted'}`).join('\n')
    : 'No previous touchpoints.'

  try {
    let result = ''

    // ─── EMAIL DRAFTER ───────────────────────────────────────────────
    if (action === 'draft_email') {
      const isFollowUp = touchpoints?.length > 0
      const system = `You are ${identity.persona}, ${identity.role} at ${identity.company}.
You write ${isFollowUp ? 'follow-up' : 'cold outreach'} emails with a ${identity.tone} tone.
Your services: ${identity.services}.
Write emails that are concise (under 120 words), personalised, and end with a single clear CTA.
Return ONLY the email — subject line first labeled "Subject:", then a blank line, then the body. No preamble.`

      const user = `Write a ${isFollowUp ? 'follow-up' : 'cold outreach'} email to:
Name: ${lead.name}
Company: ${lead.company}
Email: ${lead.email}
Notes: ${lead.notes || 'none'}
Previous contact history:
${touchpointSummary}
${isFollowUp ? `Last status: ${lead.status}` : ''}`

      result = await callClaude(system, user)
    }

    // ─── LINKEDIN MESSAGE ────────────────────────────────────────────
    else if (action === 'linkedin_message') {
      const system = `You are ${identity.persona}, ${identity.role} at ${identity.company}.
You write short, genuine LinkedIn messages with a ${identity.tone} tone.
Your services: ${identity.services}.
Messages must be under 300 characters, conversational, not salesy. No emojis unless natural.
Return ONLY the message text. No preamble.`

      const user = `Write a LinkedIn message to:
Name: ${lead.name}
Company: ${lead.company}
LinkedIn: ${lead.linkedin_url || 'not provided'}
Notes: ${lead.notes || 'none'}
Previous outreach:
${touchpointSummary}`

      result = await callClaude(system, user)
    }

    // ─── FOLLOW-UP SUGGESTER ─────────────────────────────────────────
    else if (action === 'followup_suggest') {
      const system = `You are an expert sales coach analysing Usama Shakir's pipeline.
You give sharp, specific next-step recommendations — not generic advice.
Consider channel diversity, timing, and lead temperature.
Return a JSON object: { nextAction: string, channel: string, timing: string, reasoning: string, messageHint: string }
nextAction: what to do. channel: call/email/linkedin/message. timing: e.g. "today", "in 2 days", "this week".
reasoning: 1 sentence why. messageHint: a specific opening line or angle to use.`

      const user = `Lead: ${lead.name} at ${lead.company}
Status: ${lead.status}, Score: ${lead.score_override ?? lead.score}/10
Campaign: ${campaign?.name || 'unknown'}
Notes: ${lead.notes || 'none'}
Previous touchpoints:
${touchpointSummary}
Days since last contact: ${lead.last_contacted_at ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000) : 'never contacted'}
What should Usama do next with this lead?`

      const raw = await callClaude(system, user)
      try {
        result = raw.replace(/```json|```/g, '').trim()
        JSON.parse(result) // validate
      } catch {
        result = JSON.stringify({ nextAction: raw, channel: 'email', timing: 'today', reasoning: '', messageHint: '' })
      }
    }

    // ─── EOD REPORT ──────────────────────────────────────────────────
    else if (action === 'eod_report') {
      const db = supabaseAdmin()
      const today = new Date().toISOString().split('T')[0]

      const [{ data: todayTouchpoints }, { data: stats }, { data: campaigns }] = await Promise.all([
        db.from('touchpoints').select('*, lead:leads(name, company, campaign:campaigns(name))').gte('created_at', `${today}T00:00:00`),
        db.from('user_stats').select('*').single(),
        db.from('campaigns').select('*').eq('is_active', true),
      ])

      const system = `You are an executive assistant generating Usama Shakir's daily sales report.
Write in a clear, energising, military-brief style. Celebrate wins, be honest about gaps.
Format with sections: WINS TODAY, PIPELINE MOVES, WHAT NEEDS ATTENTION, TOMORROW'S PRIORITIES.
Keep it under 400 words. EST timezone. Sign off with an Islamic closing — Alhamdulillah or similar.`

      const user = `Generate EOD report for Usama Shakir — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}

Today's touchpoints (${todayTouchpoints?.length || 0} total):
${(todayTouchpoints || []).map((t: any) => `- ${t.channel.toUpperCase()} with ${t.lead?.name} at ${t.lead?.company} (${t.lead?.campaign?.name}): ${t.outcome || 'logged'}`).join('\n') || 'None logged'}

Current stats: Level ${stats?.level}, ${stats?.total_xp} XP, ${stats?.streak_days} day streak

Wins logged: ${reviewData?.wins || 'not provided'}
What was missed: ${reviewData?.missed || 'not provided'}
Tomorrow's intentions: ${reviewData?.tomorrow || 'not provided'}

Active campaigns: ${(campaigns || []).map((c: any) => c.name).join(', ')}`

      result = await callClaude(system, user)

      // Save report to daily_reviews
      await db.from('daily_reviews').upsert({
        date: today,
        wins: reviewData?.wins || '',
        missed: reviewData?.missed || '',
        tomorrow_intentions: reviewData?.tomorrow || '',
        mood: reviewData?.mood || 3,
      }, { onConflict: 'date' })
    }

    // ─── DAILY WISDOM ────────────────────────────────────────────────
    else if (action === 'daily_wisdom') {
      const system = `You generate a daily morning wisdom quote for Usama Shakir, a Muslim sales professional.
Rotate between: Hadith of Prophet Muhammad (PBUH), Quranic wisdom, quotes from great Islamic scholars, and timeless wisdom from great men of history (Marcus Aurelius, Churchill, Ali ibn Abi Talib, etc).
Return a JSON object: { quote: string, attribution: string, reflection: string }
quote: the actual quote (keep under 50 words). attribution: who said it. reflection: one sentence on how it applies to sales/work today.
No preamble. Return only valid JSON.`

      const user = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}. Give Usama his morning wisdom.`

      const raw = await callClaude(system, user)
      try {
        result = raw.replace(/```json|```/g, '').trim()
        JSON.parse(result)
      } catch {
        result = JSON.stringify({
          quote: 'Make it a habit to do good.',
          attribution: 'Ali ibn Abi Talib (R.A.)',
          reflection: 'Every touchpoint you log today is a habit of good work compounding.'
        })
      }
    }

    // ─── PIPELINE ANALYSIS ───────────────────────────────────────────
    else if (action === 'pipeline_analysis') {
      const db = supabaseAdmin()
      const { data: allLeads } = await db.from('leads').select('*, campaign:campaigns(name)').not('status', 'in', '(won,lost)')
      const { data: recentTouchpoints } = await db.from('touchpoints').select('*, lead:leads(name)').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

      const system = `You are a sharp sales manager reviewing Usama Shakir's full pipeline.
Give actionable, specific advice — not generic tips. Identify who to call today, who is going cold, and where the best opportunities are.
Format: HOT RIGHT NOW, GOING COLD (act fast), BEST OPPORTUNITIES, TODAY'S CALL LIST (max 5 names).
Keep under 350 words.`

      const user = `Pipeline overview (${allLeads?.length || 0} active leads):
${(allLeads || []).slice(0, 20).map((l: any) => `- ${l.name} at ${l.company} | ${l.campaign?.name} | Status: ${l.status} | Score: ${l.score_override ?? l.score} | Last contact: ${l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : 'never'}`).join('\n')}

Last 7 days of activity (${recentTouchpoints?.length || 0} touchpoints):
${(recentTouchpoints || []).slice(0, 10).map((t: any) => `- ${t.channel} with ${t.lead?.name}: ${t.outcome || 'logged'}`).join('\n') || 'None'}`

      result = await callClaude(system, user)
    }

    else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, result, identity })

  } catch (err: any) {
    console.error('AI route error:', err)
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 })
  }
}
