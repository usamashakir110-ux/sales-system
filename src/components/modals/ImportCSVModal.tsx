'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface Props { campaignId: string; onClose: () => void; onImported: () => void }

export default function ImportCSVModal({ campaignId, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  function parseCSV(text: string) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = values[i] || '' })
      return obj
    }).filter(row => row.name || row['full name'] || row['first name'])
  }

  function handleFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setPreview(rows.slice(0, 5))
    }
    reader.readAsText(f)
  }

  function mapRow(row: any) {
    return {
      campaign_id: campaignId,
      name: row.name || row['full name'] || `${row['first name'] || ''} ${row['last name'] || ''}`.trim(),
      company: row.company || row.organization || '',
      email: row.email || row['email address'] || '',
      phone: row.phone || row['phone number'] || row.mobile || '',
      linkedin_url: row.linkedin || row['linkedin url'] || '',
      notes: row.notes || row.note || '',
      priority: row.priority || 'medium',
      status: 'new', score: 5, cadence_day: 1,
    }
  }

  async function importAll() {
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      const mapped = rows.map(mapRow).filter(r => r.name)
      const errs: string[] = []

      // Batch insert in chunks of 50
      for (let i = 0; i < mapped.length; i += 50) {
        const chunk = mapped.slice(i, i + 50)
        const { error } = await supabase.from('leads').insert(chunk)
        if (error) errs.push(`Rows ${i}-${i + chunk.length}: ${error.message}`)
      }

      setErrors(errs)
      setImporting(false)
      setDone(true)
      if (errs.length === 0) setTimeout(onImported, 1500)
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#13131a] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">Import from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            {errors.length === 0 ? (
              <>
                <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-lg">Import successful!</p>
                <p className="text-gray-400 text-sm mt-1">All leads have been added to this campaign.</p>
              </>
            ) : (
              <>
                <AlertCircle size={48} className="text-amber-400 mx-auto mb-3" />
                <p className="font-semibold text-lg">Imported with some errors</p>
                {errors.map((e, i) => <p key={i} className="text-xs text-red-400 mt-1">{e}</p>)}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-4 text-xs text-gray-400 border border-[var(--border)]">
              <p className="font-medium text-white mb-1">Supported CSV columns:</p>
              <p>name, company, email, phone, linkedin, notes, priority</p>
              <p className="mt-1">Also works with: "full name", "first name"+"last name", "phone number", "email address"</p>
            </div>

            {!file ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] hover:border-orange-500/50 rounded-2xl p-10 cursor-pointer transition-colors">
                <Upload size={32} className="text-gray-400 mb-3" />
                <p className="font-medium">Click to upload CSV</p>
                <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            ) : (
              <>
                <div className="glass rounded-xl p-3 mb-4">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400">{preview.length}+ leads detected</p>
                </div>

                {preview.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Preview (first 5 rows):</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {preview.map((row, i) => {
                        const mapped = mapRow(row)
                        return (
                          <div key={i} className="text-xs bg-[var(--surface-2)] rounded-lg px-3 py-2">
                            <span className="font-medium">{mapped.name}</span>
                            {mapped.company && <span className="text-gray-400"> · {mapped.company}</span>}
                            {mapped.email && <span className="text-gray-500"> · {mapped.email}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setFile(null)} className="btn-ghost flex-1">Change File</button>
                  <button onClick={importAll} disabled={importing} className="btn-primary flex-1">
                    {importing ? 'Importing...' : 'Import All Leads'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
