'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, CheckCircle, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react'

interface Props {
  campaignId: string
  onClose: () => void
  onImported: () => void
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'full_name', 'contact name', 'contact_name', 'lead name', 'lead_name', 'person'],
  first_name: ['first name', 'first_name', 'firstname', 'given name', 'given_name', 'fname'],
  last_name: ['last name', 'last_name', 'lastname', 'surname', 'family name', 'family_name', 'lname'],
  company: ['company', 'company name', 'company_name', 'business', 'business name', 'business_name', 'organization', 'organisation', 'org', 'employer', 'account', 'account name'],
  email: ['email', 'email address', 'email_address', 'e-mail', 'e mail', 'mail'],
  phone: ['phone', 'phone number', 'phone_number', 'phonenumber', 'mobile', 'mobile number', 'mobile_number', 'cell', 'cell phone', 'telephone', 'tel', 'contact number', 'contact_number', 'number'],
  linkedin_url: ['linkedin', 'linkedin url', 'linkedin_url', 'linkedin profile', 'linkedin_profile', 'li'],
  notes: ['notes', 'note', 'comments', 'comment', 'description', 'details', 'info', 'additional info'],
  priority: ['priority', 'lead priority', 'importance'],
  city: ['city', 'town', 'municipality'],
  province: ['province', 'state', 'province/state', 'province_state', 'region', 'territory', 'prov', 'st'],
  country: ['country', 'nation', 'country code'],
  address: ['address', 'street', 'street address', 'mailing address', 'full address'],
  website: ['website', 'web', 'url', 'site', 'web address', 'homepage'],
  industry: ['industry', 'sector', 'vertical', 'niche'],
  title: ['title', 'job title', 'position', 'role', 'job role', 'designation'],
}

const LEAD_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'notes', label: 'Notes' },
  { key: 'priority', label: 'Priority' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province / State' },
  { key: 'country', label: 'Country' },
  { key: 'address', label: 'Address' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'title', label: 'Job Title' },
  { key: '__ignore__', label: '— Ignore this column —' },
]

function normalise(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function autoDetect(csvHeader: string): string {
  const n = normalise(csvHeader)
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => normalise(a) === n)) return field
  }
  return '__ignore__'
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
      else { current += ch }
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  }).filter(row => Object.values(row).some(v => v !== ''))

  return { headers, rows }
}

function buildLead(row: Record<string, string>, mapping: Record<string, string>, campaignId: string) {
  const collected: Record<string, string[]> = {}
  for (const [csvCol, leadField] of Object.entries(mapping)) {
    if (leadField === '__ignore__') continue
    const val = row[csvCol]?.trim() || ''
    if (!val) continue
    if (!collected[leadField]) collected[leadField] = []
    collected[leadField].push(val)
  }

  let name = collected['name']?.[0] || ''
  if (!name) {
    const first = collected['first_name']?.[0] || ''
    const last = collected['last_name']?.[0] || ''
    name = `${first} ${last}`.trim()
  }

  const locationParts: string[] = []
  if (collected['address']?.[0]) locationParts.push(collected['address'][0])
  if (collected['city']?.[0]) locationParts.push(collected['city'][0])
  if (collected['province']?.[0]) locationParts.push(collected['province'][0])
  if (collected['country']?.[0]) locationParts.push(collected['country'][0])

  const extraNotes: string[] = []
  if (locationParts.length > 0) extraNotes.push(`Location: ${locationParts.join(', ')}`)
  if (collected['industry']?.[0]) extraNotes.push(`Industry: ${collected['industry'][0]}`)
  if (collected['title']?.[0]) extraNotes.push(`Title: ${collected['title'][0]}`)
  if (collected['website']?.[0]) extraNotes.push(`Website: ${collected['website'][0]}`)
  const baseNotes = collected['notes']?.[0] || ''
  const notes = [baseNotes, ...extraNotes].filter(Boolean).join('\n')

  const priority = collected['priority']?.[0]?.toLowerCase() || 'medium'
  const validPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium'

  return {
    campaign_id: campaignId,
    name,
    company: collected['company']?.[0] || '',
    email: collected['email']?.[0] || '',
    phone: collected['phone']?.[0] || '',
    linkedin_url: collected['linkedin_url']?.[0] || '',
    notes,
    priority: validPriority,
    status: 'new',
    score: 5,
    cadence_day: 1,
  }
}

export default function ImportCSVModal({ campaignId, onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState(0)

  function handleFile(f: File) {
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      setHeaders(h)
      setRows(r)
      const auto: Record<string, string> = {}
      h.forEach(col => { auto[col] = autoDetect(col) })
      setMapping(auto)
      setStep('map')
    }
    reader.readAsText(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }, [])

  function setField(col: string, field: string) {
    setMapping(m => ({ ...m, [col]: field }))
  }

  const nameIsMapped = Object.values(mapping).some(
    v => v === 'name' || v === 'first_name' || v === 'last_name'
  )

  async function runImport() {
    setStep('importing')
    const leads = rows
      .map(row => buildLead(row, mapping, campaignId))
      .filter(l => l.name.trim() !== '')

    const errs: string[] = []
    let count = 0

    for (let i = 0; i < leads.length; i += 50) {
      const chunk = leads.slice(i, i + 50)
      const { error } = await supabase.from('leads').insert(chunk)
      if (error) errs.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`)
      else count += chunk.length
    }

    setImportedCount(count)
    setErrors(errs)
    setStep('done')
    if (errs.length === 0) setTimeout(onImported, 1800)
  }

  const mappedCount = Object.values(mapping).filter(v => v !== '__ignore__').length
  const ignoredCount = Object.values(mapping).filter(v => v === '__ignore__').length

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-display font-bold text-xl">Import from CSV</h2>
            {step === 'map' && (
              <p className="text-xs text-gray-400 mt-0.5">{rows.length} leads detected in <span className="text-white">{fileName}</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Step indicators */}
        {(step === 'upload' || step === 'map') && (
          <div className="flex gap-0 px-6 pt-4 pb-1">
            {['Upload', 'Map Columns', 'Import'].map((s, i) => {
              const active = (step === 'upload' && i === 0) || (step === 'map' && i === 1)
              const done = (step === 'map' && i === 0)
              return (
                <div key={s} className="flex items-center gap-1.5">
                  {i > 0 && <div className="w-8 h-px bg-[var(--border)] mx-1" />}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-cyan-400' : done ? 'text-green-400' : 'text-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${active ? 'bg-cyan-500/20 border border-cyan-500/50' : done ? 'bg-green-500/20 border border-green-500/50' : 'bg-white/5 border border-white/10'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {s}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* STEP 1 — Upload */}
          {step === 'upload' && (
            <label
              className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] hover:border-cyan-500/50 rounded-2xl p-12 cursor-pointer transition-colors mt-2"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <Upload size={36} className="text-gray-400 mb-3" />
              <p className="font-medium text-base">Click to upload CSV</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
              <p className="text-xs text-gray-600 mt-3">Any CSV format — columns are auto-detected</p>
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          )}

          {/* STEP 2 — Map Columns */}
          {step === 'map' && (
            <div>
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg px-3 py-1.5">
                  <span className="font-bold">{mappedCount}</span> columns mapped
                </div>
                {ignoredCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-lg px-3 py-1.5">
                    <span className="font-bold">{ignoredCount}</span> ignored
                  </div>
                )}
                {!nameIsMapped && (
                  <div className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5">
                    ⚠ Map a name column to continue
                  </div>
                )}
              </div>

              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-[var(--border)] text-xs text-gray-500 font-medium uppercase tracking-wide">
                  <div className="col-span-4">Your CSV Column</div>
                  <div className="col-span-3">Sample Value</div>
                  <div className="col-span-5">Maps To</div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {headers.map(col => {
                    const sample = rows.slice(0, 3).map(r => r[col]).filter(Boolean).join(', ') || '—'
                    const mapped = mapping[col] || '__ignore__'
                    const isIgnored = mapped === '__ignore__'
                    return (
                      <div key={col} className={`grid grid-cols-12 gap-3 px-4 py-2.5 items-center transition-colors ${isIgnored ? 'opacity-50' : ''}`}>
                        <div className="col-span-4">
                          <span className="text-sm font-medium text-white">{col}</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-xs text-gray-500 truncate block" title={sample}>{sample}</span>
                        </div>
                        <div className="col-span-5 relative">
                          <select
                            value={mapped}
                            onChange={e => setField(col, e.target.value)}
                            className="input text-xs py-1 w-full appearance-none pr-7"
                          >
                            {LEAD_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {nameIsMapped && rows.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Preview — first 3 leads after mapping:</p>
                  <div className="space-y-2">
                    {rows.slice(0, 3).map((row, i) => {
                      const lead = buildLead(row, mapping, campaignId)
                      return (
                        <div key={i} className="bg-[var(--surface-2)] rounded-xl px-4 py-3 text-sm border border-[var(--border)]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{lead.name || '—'}</span>
                            {lead.company && <span className="text-gray-400 text-xs">· {lead.company}</span>}
                            {lead.phone && <span className="text-cyan-400 text-xs">· {lead.phone}</span>}
                            {lead.email && <span className="text-blue-400 text-xs">· {lead.email}</span>}
                          </div>
                          {lead.notes && <p className="text-xs text-gray-500 mt-1">{lead.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Importing */}
          {step === 'importing' && (
            <div className="text-center py-10">
              <RefreshCw size={40} className="text-cyan-400 mx-auto mb-4 animate-spin" />
              <p className="font-semibold text-lg">Importing {rows.length} leads...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait, this won't take long.</p>
            </div>
          )}

          {/* STEP 4 — Done */}
          {step === 'done' && (
            <div className="text-center py-8">
              {errors.length === 0 ? (
                <>
                  <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-lg">Import successful!</p>
                  <p className="text-gray-400 text-sm mt-1">
                    <span className="text-white font-medium">{importedCount} leads</span> added to this campaign.
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} className="text-amber-400 mx-auto mb-3" />
                  <p className="font-semibold text-lg">Imported {importedCount} leads with some errors</p>
                  <div className="mt-3 space-y-1">
                    {errors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'map' || step === 'upload') && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3">
            {step === 'map' && (
              <button onClick={() => setStep('upload')} className="btn-ghost flex-1 text-sm">← Back</button>
            )}
            {step === 'map' && (
              <button
                onClick={runImport}
                disabled={!nameIsMapped}
                className="btn-primary flex-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {rows.length} Leads →
              </button>
            )}
            {step === 'upload' && (
              <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
