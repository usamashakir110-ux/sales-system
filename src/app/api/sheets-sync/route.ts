import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { google } from 'googleapis'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// POST: two-way sync for a campaign
export async function POST(req: NextRequest) {
  const { campaign_id, sheet_id } = await req.json()
  const db = supabaseAdmin()

  // Get campaign
  const { data: campaign } = await db.from('campaigns').select('*').eq('id', campaign_id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Get leads
  const { data: leads } = await db.from('leads').select('*').eq('campaign_id', campaign_id)

  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Use provided sheet_id or create new sheet
  let spreadsheetId = sheet_id || campaign.sheet_id

  if (!spreadsheetId) {
    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `SalesOS — ${campaign.name}` },
        sheets: [{ properties: { title: 'Leads' } }],
      },
    })
    spreadsheetId = spreadsheet.data.spreadsheetId!
    await db.from('campaigns').update({ sheet_id: spreadsheetId }).eq('id', campaign_id)
  }

  const HEADERS = ['ID', 'Name', 'Company', 'Email', 'Phone', 'LinkedIn', 'Status', 'Score', 'Priority', 'Notes', 'Last Contacted', 'Next Contact', 'Won/Lost Reason']

  // Read existing sheet data
  let existingRows: any[][] = []
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Leads!A:M',
    })
    existingRows = res.data.values || []
  } catch { }

  // Build map of existing rows by ID
  const existingById = new Map<string, any[]>()
  for (const row of existingRows.slice(1)) {
    if (row[0]) existingById.set(row[0], row)
  }

  // Merge: update existing leads from sheet changes, add new leads
  for (const row of existingRows.slice(1)) {
    const id = row[0]
    if (!id) continue
    const lead = leads?.find(l => l.id === id)
    if (lead && row[6] !== lead.status) {
      // Sheet status differs — update DB (sheet wins for status)
      await db.from('leads').update({ status: row[6] || lead.status }).eq('id', id)
    }
  }

  // Write all leads back to sheet
  const rows = (leads || []).map(l => [
    l.id, l.name, l.company, l.email, l.phone, l.linkedin_url,
    l.status, l.score_override ?? l.score, l.priority, l.notes,
    l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : '',
    l.next_contact_date || '',
    l.won_lost_reason || '',
  ])

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS, ...rows] },
  })

  // Format header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.976, green: 0.451, blue: 0.086 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      }]
    }
  }).catch(() => {})

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  return NextResponse.json({ ok: true, spreadsheetId, url: sheetUrl })
}
