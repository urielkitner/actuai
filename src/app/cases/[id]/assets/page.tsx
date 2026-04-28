'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { loadAssets, saveAssets, deleteAsset } from '@/lib/db'
import type { Assets, RealEstateRow, PensionRow, BusinessRow, SimpleRow, SecuritiesRow, BankRow } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type Balanceable = 'balanceable' | 'excluded'

// Types are imported from @/lib/db

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultRE = (): RealEstateRow => ({
  id: crypto.randomUUID(), name: '', type: 'residential', status: '', valueA: 0, valueB: 0,
  balanceable: 'balanceable', balancePercent: 50, appraisalDate: '', mortgage: 0,
})
const defaultPension = (): PensionRow => ({
  id: crypto.randomUUID(), fundName: '', productType: 'pension', startDate: '',
  balance: 0, marriagePeriodShare: 100, party: 'A', balanceable: 'balanceable', balancePercent: 50,
  company: '', policyNumber: '', status: '',
})
const defaultBusiness = (): BusinessRow => ({
  id: crypto.randomUUID(), companyName: '', ownershipPercent: 100, value: 0,
  appraised: false, foundedDate: '', party: 'A', balanceable: 'balanceable', balancePercent: 50,
  companyId: '', ownershipA: 0, ownershipB: 0,
})
const defaultSimple = (): SimpleRow => ({
  id: crypto.randomUUID(), name: '', valueA: 0, valueB: 0, balanceable: 'balanceable', balancePercent: 50,
})
const defaultSecurities = (): SecuritiesRow => ({
  id: crypto.randomUUID(), name: '', securityType: 'stocks', party: 'A',
  marketValue: 0, costBasis: 0, taxRate: 25, expiryDate: '',
  balanceable: 'balanceable', balancePercent: 50,
})
const defaultBank = (): BankRow => ({
  id: crypto.randomUUID(), name: '', accountNumber: '', accountType: 'current', party: 'A',
  currency: '₪', balance: 0, exchangeRate: 1, liquidityDate: '',
  interestRate: 0, creditUsed: 0, balanceable: 'balanceable', balancePercent: 50,
})

// ─── Primitive UI helpers (module-level — safe to use inside any component) ──

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{title}</h3>
      <button className="btn-primary" onClick={onAdd} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
        + הוסף שורה
      </button>
    </div>
  )
}

function Inp({ value, onChange, type = 'text', placeholder = '', dir = 'rtl' }: {
  value: string | number; onChange: (v: string) => void
  type?: string; placeholder?: string; dir?: string
}) {
  return (
    <input
      type={type}
      className="input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', minWidth: '80px' }}
    />
  )
}

function Sel({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', minWidth: '100px' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
        borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: '600',
      }}
    >
      ✕
    </button>
  )
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const formatted = value.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₪'
  if (editing) {
    return (
      <input
        type="number"
        className="input"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={() => setEditing(false)}
        autoFocus
        dir="ltr"
        style={{ fontWeight: 700, minWidth: '120px' }}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontWeight: 700, fontSize: '14px', cursor: 'text',
        padding: '6px 8px', borderRadius: '4px', direction: 'ltr',
        textAlign: 'left', whiteSpace: 'nowrap', minWidth: '120px',
      }}
    >
      {formatted}
    </div>
  )
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '3rem', border: '2px dashed #e5e7eb',
      borderRadius: '0.75rem', color: '#9ca3af',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>אין {label} עדיין</p>
      <button className="btn-primary" onClick={onAdd}>+ הוסף {label}</button>
    </div>
  )
}

function formatNum(n: number) {
  return n.toLocaleString('he-IL')
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ['פרטי הצדדים', 'נכסים', 'סיכום']
  return (
    <div className="step-indicator" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
      {steps.map((label, i) => {
        const num = i + 1
        const state = num < step ? 'completed' : num === step ? 'active' : 'inactive'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="step" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
              <div className={`step-circle ${state}`}>
                {state === 'completed' ? '✓' : num}
              </div>
              <span style={{
                fontSize: '0.75rem', whiteSpace: 'nowrap',
                color: state === 'inactive' ? '#9ca3af' : '#374151',
                fontWeight: state === 'active' ? '600' : '400',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`step-line ${num < step ? 'completed' : 'inactive'}`}
                style={{ margin: '0 0.5rem', marginTop: '-1.25rem' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Table components (module-level — React sees the same type across renders) ─
//
// Previously these were defined INSIDE AssetsPage. On every keystroke the parent
// re-rendered, JavaScript created brand-new function objects for each table
// component, React treated them as different component types, unmounted the old
// DOM nodes and mounted fresh ones — losing input focus. Lifting them to module
// scope gives them stable identity: React reconciles them in-place on re-render
// and focus is never lost.

interface RealEstateTableProps {
  rows: RealEstateRow[]
  onUpdate: (idx: number, field: keyof RealEstateRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function RealEstateTable({ rows, onUpdate, onAdd, onRemove }: RealEstateTableProps) {
  return (
    <>
      <SectionHeader title='נכסי נדל"ן' onAdd={onAdd} />
      {rows.length === 0 ? (
        <EmptyState label='נדל"ן' onAdd={onAdd} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם הנכס</th><th>סוג</th><th>סטטוס</th>
                <th>שווי צד א (₪)</th><th>שווי צד ב (₪)</th>
                <th>בר-איזון</th><th>% איזון</th>
                <th>תאריך שמאות</th><th>משכנתא (₪)</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td><Inp value={r.name} onChange={v => onUpdate(i, 'name', v)} placeholder="שם הנכס" /></td>
                  <td>
                    <Sel value={r.type} onChange={v => onUpdate(i, 'type', v)} options={[
                      { value: 'residential', label: 'מגורים' },
                      { value: 'investment', label: 'השקעה' },
                      { value: 'construction', label: 'בנייה' },
                      { value: 'commercial', label: 'מסחרי' },
                    ]} />
                  </td>
                  <td><Inp value={r.status} onChange={v => onUpdate(i, 'status', v)} placeholder="סטטוס" /></td>
                  <td><Inp type="number" value={r.valueA} onChange={v => onUpdate(i, 'valueA', Number(v))} dir="ltr" /></td>
                  <td><Inp type="number" value={r.valueB} onChange={v => onUpdate(i, 'valueB', Number(v))} dir="ltr" /></td>
                  <td>
                    <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                      { value: 'balanceable', label: 'בר-איזון' },
                      { value: 'excluded', label: 'מוחרג' },
                    ]} />
                  </td>
                  <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                  <td><Inp type="date" value={r.appraisalDate} onChange={v => onUpdate(i, 'appraisalDate', v)} dir="ltr" /></td>
                  <td><Inp type="number" value={r.mortgage} onChange={v => onUpdate(i, 'mortgage', Number(v))} dir="ltr" /></td>
                  <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ marginTop: '0.75rem', textAlign: 'left', color: '#6366f1', fontSize: '0.8125rem', fontWeight: '600' }}>
          סה&quot;כ: צד א — ₪{formatNum(rows.reduce((s, r) => s + r.valueA, 0))} | צד ב — ₪{formatNum(rows.reduce((s, r) => s + r.valueB, 0))}
        </div>
      )}
    </>
  )
}

// ─── Maslaka column mapping ───────────────────────────────────────────────────

const COL_PRODUCT_NAME   = 'שם מוצר'
const COL_COMPANY        = 'שם חברה מנהלת'
const COL_PRODUCT_TYPE   = 'סוג מוצר'
const COL_STATUS         = 'סטטוס'
const COL_TOTAL_SAVINGS  = 'סך הכל חיסכון'
const COL_JOIN_DATE      = 'תאריך הצטרפות לראשונה'

function parseProductType(raw: string): PensionRow['productType'] {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('גמל'))          return 'gemel'
  if (s.includes('השתלמות'))      return 'hishtalmut'
  if (s.includes('צבאי'))        return 'military'
  if (s.includes('ממשלתי'))      return 'governmental'
  return 'pension'
}

interface MaslakaPreviewRow {
  id: string
  productName: string
  company: string
  policyNumber: string
  productType: string
  status: string
  totalSavings: number
  joinDate: string
  raw: Record<string, unknown>
  checked: boolean
}

interface MaslakaImportModalProps {
  onImport: (rows: PensionRow[]) => void
  onClose: () => void
}

function MaslakaImportModal({ onImport, onClose }: MaslakaImportModalProps) {
  const [party, setParty] = useState<'A' | 'B'>('A')
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [preview, setPreview] = useState<MaslakaPreviewRow[]>([])
  const [parseError, setParseError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setParseError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        console.log('[Maslaka] Sheet names:', wb.SheetNames)

        // ── 1. Find the right sheet ───────────────────────────────────────────
        // Standard Maslaka export always has a sheet named 'פרטי המוצרים שלי'.
        // Fall back to signal scan only if that sheet is missing.
        const PREFERRED_SHEET = 'פרטי המוצרים שלי'
        const HEADER_SIGNALS  = ['שם מוצר', 'חיסכון', 'פוליסה', 'סטטוס', 'חברה']

        let bestAllRows: unknown[][] = []
        let bestHeaderIdx = -1

        const preferredWs = wb.Sheets[PREFERRED_SHEET]
        if (preferredWs) {
          const rows = XLSX.utils.sheet_to_json<unknown[]>(preferredWs, { header: 1, defval: '' }) as unknown[][]
          console.log(`[Maslaka] Preferred sheet "${PREFERRED_SHEET}": ${rows.length} rows`)
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const cells = (rows[i] as unknown[]).map(c => String(c ?? '').trim())
            const hits = HEADER_SIGNALS.filter(sig => cells.some(c => c.includes(sig)))
            if (hits.length >= 2) {
              bestAllRows = rows
              bestHeaderIdx = i
              console.log(`[Maslaka] Header at row ${i}: hits=${hits.join(',')}`)
              break
            }
          }
        }

        // Fallback: scan all sheets; require 'שם מוצר' plus ≥2 other signals
        if (bestHeaderIdx < 0) {
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName]
            const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
            console.log(`[Maslaka] Scanning "${sheetName}": ${rows.length} rows`)
            for (let i = 0; i < Math.min(rows.length, 30); i++) {
              const cells = (rows[i] as unknown[]).map(c => String(c ?? '').trim())
              const hits = HEADER_SIGNALS.filter(sig => cells.some(c => c.includes(sig)))
              if (hits.length >= 3 && cells.some(c => c.includes('שם מוצר'))) {
                bestAllRows = rows
                bestHeaderIdx = i
                console.log(`[Maslaka] Header in "${sheetName}" row ${i}: hits=${hits.join(',')}`)
                break
              }
            }
            if (bestHeaderIdx >= 0) break
          }
        }

        // Last-resort fallback
        if (bestHeaderIdx < 0) {
          console.warn('[Maslaka] No header found — falling back to sheet 0 row 0')
          const ws = wb.Sheets[wb.SheetNames[0]]
          bestAllRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
          bestHeaderIdx = 0
        }

        const headers = bestAllRows[bestHeaderIdx].map(c => String(c ?? '').trim())
        console.log('[Maslaka] Headers:', headers)

        const dataRows = bestAllRows
          .slice(bestHeaderIdx + 1)
          .filter(r => (r as unknown[]).some(c => String(c ?? '').trim() !== ''))

        console.log('[Maslaka] Data rows:', dataRows.length)
        if (dataRows.length === 0) { setParseError('לא נמצאו שורות נתונים בקובץ'); return }

        // ── 2. Column indices ──────────────────────────────────────────────────
        const findCol = (needles: string[]): number => {
          const idx = headers.findIndex(h => needles.some(n => h.includes(n)))
          console.log(`[Maslaka] findCol(${JSON.stringify(needles)}) → ${idx}${idx >= 0 ? ` "${headers[idx]}"` : ' NOT FOUND'}`)
          return idx
        }

        const idxProductName  = findCol([COL_PRODUCT_NAME])
        const idxCompany      = findCol([COL_COMPANY, 'חברה מנהלת', 'חברה'])
        const idxPolicyNumber = findCol(['מספר פוליסה', 'פוליסה', 'מס\' פוליסה'])
        const idxProductType  = findCol([COL_PRODUCT_TYPE])
        const idxStatus       = findCol([COL_STATUS])
        const idxSavings      = findCol([COL_TOTAL_SAVINGS, 'סך הכל', 'חיסכון'])
        const idxJoinDate     = findCol([COL_JOIN_DATE, 'תאריך הצטרפות', 'תאריך פתיחה'])

        const getCell = (row: unknown[], idx: number) => idx >= 0 ? String(row[idx] ?? '').trim() : ''
        const getNum  = (row: unknown[], idx: number): number => {
          if (idx < 0) return 0
          const v = row[idx]
          if (typeof v === 'number') return v
          const raw = String(v ?? '').replace(/[^0-9.-]/g, '')
          return parseFloat(raw) || 0
        }

        const rows: MaslakaPreviewRow[] = dataRows.map((row) => {
          const r = row as unknown[]
          const productName = getCell(r, idxProductName)
          // col סוג מוצר is often empty; fall back to שם מוצר so parseProductType can infer the type
          const productType = getCell(r, idxProductType) || productName
          return {
            id: crypto.randomUUID(),
            productName,
            company:       getCell(r, idxCompany),
            policyNumber:  getCell(r, idxPolicyNumber),
            productType,
            status:        getCell(r, idxStatus),
            totalSavings:  getNum(r, idxSavings),
            joinDate:      getCell(r, idxJoinDate),
            raw:           Object.fromEntries(headers.map((h, i) => [h || `col_${i}`, r[i]])),
            checked:       true,
          }
        })

        console.log('[Maslaka] Sample:', JSON.stringify(rows.slice(0, 3).map(r => ({
          productName: r.productName, company: r.company, status: r.status, totalSavings: r.totalSavings,
        }))))

        setPreview(rows)
        setStep('preview')
      } catch (err) {
        console.error('[Maslaka] Parse error:', err)
        setParseError('שגיאה בקריאת הקובץ. וודא שהקובץ תקין ובפורמט .xls / .xlsx')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const toggleRow = (id: string) =>
    setPreview(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r))

  const toggleAll = (checked: boolean) =>
    setPreview(prev => prev.map(r => ({ ...r, checked })))

  const handleImport = () => {
    const selected = preview.filter(r => r.checked)
    const pensionRows: PensionRow[] = selected.map(r => ({
      id: crypto.randomUUID(),
      fundName: r.productName || r.company,
      productType: parseProductType(r.productType),
      startDate: r.joinDate || '',
      balance: r.totalSavings,
      marriagePeriodShare: 100,
      party,
      balanceable: 'balanceable',
      balancePercent: 50,
      company: r.company,
      policyNumber: r.policyNumber,
      status: r.status,
    }))
    onImport(pensionRows)
    setSuccessMsg(`יובאו ${pensionRows.length} נכסים בהצלחה`)
    setTimeout(() => { onClose() }, 1500)
  }

  const checkedCount = preview.filter(r => r.checked).length

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: '14px', width: '90%', maxWidth: '820px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>ייבוא מהמסלקה</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af', fontWeight: 300 }}>
              העלה קובץ Excel מהמסלקה הפנסיונית הלאומית
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {successMsg ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#16a34a', fontSize: '16px', fontWeight: 600 }}>
              ✓ {successMsg}
            </div>
          ) : step === 'upload' ? (
            <>
              {/* Party selector */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                  שייך ל:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['A', 'B'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setParty(p)}
                      style={{
                        padding: '9px 28px', borderRadius: '8px', border: '2px solid',
                        borderColor: party === p ? '#4f46e5' : '#e5e7eb',
                        background: party === p ? '#4f46e5' : 'white',
                        color: party === p ? 'white' : '#374151',
                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      {p === 'A' ? "צד א'" : "צד ב'"}
                    </button>
                  ))}
                </div>
              </div>

              {/* File upload */}
              <div
                style={{
                  border: '2px dashed #d1d5db', borderRadius: '10px', padding: '36px',
                  textAlign: 'center', cursor: 'pointer', background: '#fafafa',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4f46e5' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#d1d5db' }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = '#d1d5db'
                  const file = e.dataTransfer.files[0]
                  if (file) handleFile(file)
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📥</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  גרור קובץ לכאן או לחץ לבחירה
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 300 }}>
                  קבצי .xls ו-.xlsx בלבד
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              {parseError && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
                  {parseError}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview table */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 300 }}>
                  נמצאו {preview.length} שורות — {checkedCount} נבחרו
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleAll(true)}  style={{ fontSize: '12px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>בחר הכל</button>
                  <button onClick={() => toggleAll(false)} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>נקה הכל</button>
                  <button onClick={() => setStep('upload')} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>← חזור</button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f0f0f0', width: '36px' }}>
                        <input type="checkbox" checked={checkedCount === preview.length && preview.length > 0} onChange={e => toggleAll(e.target.checked)} />
                      </th>
                      {['שם מוצר', 'חברה מנהלת', 'סוג מוצר', 'סטטוס', 'סך הכל חיסכון'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < preview.length - 1 ? '1px solid #f9fafb' : 'none', background: r.checked ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '9px 12px' }}>
                          <input type="checkbox" checked={r.checked} onChange={() => toggleRow(r.id)} />
                        </td>
                        <td style={{ padding: '9px 12px', color: '#1a1a2e', fontWeight: 500 }}>{r.productName || '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.company || '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.productType || '—'}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: r.status === 'פעיל' ? '#dcfce7' : '#f1f5f9', color: r.status === 'פעיל' ? '#16a34a' : '#64748b' }}>
                            {r.status || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', color: '#1a1a2e', fontWeight: 600, direction: 'ltr', textAlign: 'left' }}>
                          ₪{r.totalSavings.toLocaleString('he-IL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successMsg && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={checkedCount === 0}
                style={{
                  padding: '10px 24px', borderRadius: '9px', border: 'none', cursor: checkedCount === 0 ? 'not-allowed' : 'pointer',
                  background: checkedCount === 0 ? '#e5e7eb' : '#4f46e5', color: checkedCount === 0 ? '#9ca3af' : 'white',
                  fontSize: '14px', fontWeight: 700,
                }}
              >
                ייבא נכסים נבחרים ({checkedCount})
              </button>
            )}
            <button
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: '9px', border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PensionTable ─────────────────────────────────────────────────────────────

interface PensionTableProps {
  rows: PensionRow[]
  onUpdate: (idx: number, field: keyof PensionRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
  onImport: (rows: PensionRow[]) => void
}

function PensionTable({ rows, onUpdate, onAdd, onRemove, onImport }: PensionTableProps) {
  const [showImportModal, setShowImportModal] = useState(false)

  return (
    <>
      {showImportModal && (
        <MaslakaImportModal
          onImport={(imported) => { onImport(imported); setShowImportModal(false) }}
          onClose={() => setShowImportModal(false)}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>קרנות פנסיה וחסכון</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '0.375rem 0.875rem', fontSize: '0.8125rem', borderRadius: '6px',
              border: '1.5px solid #4f46e5', background: 'white', color: '#4f46e5',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            📥 ייבוא מהמסלקה
          </button>
          <button className="btn-primary" onClick={onAdd} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
            + הוסף שורה
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState label="פנסיה" onAdd={onAdd} />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>שם קרן</th>
                <th style={{ minWidth: '180px' }}>שם חברה מנהלת</th>
                <th style={{ minWidth: '110px' }}>מספר פוליסה</th>
                <th style={{ minWidth: '100px' }}>סוג מוצר</th>
                <th style={{ minWidth: '90px' }}>סטטוס</th>
                <th style={{ minWidth: '130px' }}>יתרה (₪)</th>
                <th style={{ minWidth: '70px' }}>צד</th>
                <th style={{ minWidth: '80px' }}>% נישואין</th>
                <th style={{ minWidth: '90px' }}>בר-איזון</th>
                <th style={{ minWidth: '70px' }}>% איזון</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <input
                      type="text"
                      className="input"
                      value={r.fundName}
                      onChange={e => onUpdate(i, 'fundName', e.target.value)}
                      placeholder="שם הקרן"
                      style={{ fontWeight: 700, fontSize: '14px', minWidth: '150px' }}
                    />
                  </td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <Inp value={r.company} onChange={v => onUpdate(i, 'company', v)} placeholder="שם החברה" />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      value={r.policyNumber}
                      onChange={e => onUpdate(i, 'policyNumber', e.target.value)}
                      placeholder="מספר פוליסה"
                      dir="ltr"
                      style={{ textAlign: 'left', minWidth: '100px' }}
                    />
                  </td>
                  <td>
                    <Sel value={r.productType} onChange={v => onUpdate(i, 'productType', v)} options={[
                      { value: 'pension', label: 'פנסיה' },
                      { value: 'gemel', label: 'גמל' },
                      { value: 'hishtalmut', label: 'השתלמות' },
                      { value: 'military', label: 'צבאית' },
                      { value: 'governmental', label: 'ממשלתית' },
                    ]} />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={r.status}
                      onChange={e => onUpdate(i, 'status', e.target.value)}
                      style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                        background: r.status === 'פעיל' ? '#dcfce7' : r.status === 'לא פעיל' ? '#f3f4f6' : 'white',
                        color: r.status === 'פעיל' ? '#16a34a' : r.status === 'לא פעיל' ? '#6b7280' : '#374151',
                        border: r.status === 'פעיל' ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                      }}
                    >
                      <option value="">—</option>
                      <option value="פעיל">פעיל</option>
                      <option value="לא פעיל">לא פעיל</option>
                    </select>
                  </td>
                  <td>
                    <NumCell value={r.balance} onChange={v => onUpdate(i, 'balance', v)} />
                  </td>
                  <td>
                    <Sel value={r.party} onChange={v => onUpdate(i, 'party', v)} options={[
                      { value: 'A', label: 'צד א' },
                      { value: 'B', label: 'צד ב' },
                    ]} />
                  </td>
                  <td><Inp type="number" value={r.marriagePeriodShare} onChange={v => onUpdate(i, 'marriagePeriodShare', Number(v))} dir="ltr" /></td>
                  <td>
                    <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                      { value: 'balanceable', label: 'בר-איזון' },
                      { value: 'excluded', label: 'מוחרג' },
                    ]} />
                  </td>
                  <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                  <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

interface BusinessTableProps {
  rows: BusinessRow[]
  onUpdate: (idx: number, field: keyof BusinessRow, val: string | number | boolean) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function BusinessTable({ rows, onUpdate, onAdd, onRemove }: BusinessTableProps) {
  return (
    <>
      <SectionHeader title="עסקים וחברות" onAdd={onAdd} />
      {rows.length === 0 ? (
        <EmptyState label="עסק" onAdd={onAdd} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם חברה</th><th>ח.פ / ע.מ</th><th>בעלות צד א (%)</th><th>בעלות צד ב (%)</th>
                <th>שווי (₪)</th><th>הוערך ע&quot;י שמאי</th><th>תאריך הקמה</th><th>צד</th>
                <th>בר-איזון</th><th>% איזון</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const ownershipOver100 = r.ownershipA + r.ownershipB > 100
                return (
                  <tr key={r.id}>
                    <td><Inp value={r.companyName} onChange={v => onUpdate(i, 'companyName', v)} placeholder="שם החברה" /></td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={r.companyId}
                        onChange={e => onUpdate(i, 'companyId', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="000000000"
                        dir="ltr"
                        maxLength={9}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', minWidth: '100px', textAlign: 'left' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Inp type="number" value={r.ownershipA} onChange={v => onUpdate(i, 'ownershipA', Math.min(100, Math.max(0, Number(v))))} dir="ltr" />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>%</span>
                      </div>
                      {ownershipOver100 && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          סך האחוזים עולה על 100%
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Inp type="number" value={r.ownershipB} onChange={v => onUpdate(i, 'ownershipB', Math.min(100, Math.max(0, Number(v))))} dir="ltr" />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>%</span>
                      </div>
                    </td>
                    <td><Inp type="number" value={r.value} onChange={v => onUpdate(i, 'value', Number(v))} dir="ltr" /></td>
                    <td>
                      <select
                        className="input"
                        value={r.appraised ? 'yes' : 'no'}
                        onChange={e => onUpdate(i, 'appraised', e.target.value === 'yes')}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                      >
                        <option value="yes">כן</option>
                        <option value="no">לא</option>
                      </select>
                    </td>
                    <td><Inp type="date" value={r.foundedDate} onChange={v => onUpdate(i, 'foundedDate', v)} dir="ltr" /></td>
                    <td>
                      <Sel value={r.party} onChange={v => onUpdate(i, 'party', v)} options={[
                        { value: 'A', label: 'צד א' },
                        { value: 'B', label: 'צד ב' },
                      ]} />
                    </td>
                    <td>
                      <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                        { value: 'balanceable', label: 'בר-איזון' },
                        { value: 'excluded', label: 'מוחרג' },
                      ]} />
                    </td>
                    <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                    <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

interface SimpleTableProps {
  title: string
  rows: SimpleRow[]
  onUpdate: (idx: number, field: keyof SimpleRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function SimpleTable({ title, rows, onUpdate, onAdd, onRemove }: SimpleTableProps) {
  return (
    <>
      <SectionHeader title={title} onAdd={onAdd} />
      {rows.length === 0 ? (
        <EmptyState label={title} onAdd={onAdd} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם</th><th>שווי צד א (₪)</th><th>שווי צד ב (₪)</th>
                <th>בר-איזון</th><th>% איזון</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td><Inp value={r.name} onChange={v => onUpdate(i, 'name', v)} placeholder="שם" /></td>
                  <td><Inp type="number" value={r.valueA} onChange={v => onUpdate(i, 'valueA', Number(v))} dir="ltr" /></td>
                  <td><Inp type="number" value={r.valueB} onChange={v => onUpdate(i, 'valueB', Number(v))} dir="ltr" /></td>
                  <td>
                    <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                      { value: 'balanceable', label: 'בר-איזון' },
                      { value: 'excluded', label: 'מוחרג' },
                    ]} />
                  </td>
                  <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                  <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ marginTop: '0.75rem', textAlign: 'left', color: '#6366f1', fontSize: '0.8125rem', fontWeight: '600' }}>
          סה&quot;כ: צד א — ₪{formatNum(rows.reduce((s, r) => s + r.valueA, 0))} | צד ב — ₪{formatNum(rows.reduce((s, r) => s + r.valueB, 0))}
        </div>
      )}
    </>
  )
}

// ─── SecuritiesTable ──────────────────────────────────────────────────────────

interface SecuritiesTableProps {
  rows: SecuritiesRow[]
  onUpdate: (idx: number, field: keyof SecuritiesRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function SecuritiesTable({ rows, onUpdate, onAdd, onRemove }: SecuritiesTableProps) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>ניירות ערך</h3>
        <button className="btn-primary" onClick={onAdd} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>+ הוסף שורה</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState label="ניירות ערך" onAdd={onAdd} />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '1200px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>שם הנייר</th>
                <th style={{ minWidth: '110px' }}>סוג נייר</th>
                <th style={{ minWidth: '70px' }}>צד</th>
                <th style={{ minWidth: '120px' }}>שווי שוק (₪)</th>
                <th style={{ minWidth: '120px' }}>עלות רכישה (₪)</th>
                <th style={{ minWidth: '110px' }}>רווח הון (₪)</th>
                <th style={{ minWidth: '80px' }}>מס (%)</th>
                <th style={{ minWidth: '110px' }}>מס רו"ה (₪)</th>
                <th style={{ minWidth: '120px', fontWeight: 700 }}>שווי נטו (₪)</th>
                <th style={{ minWidth: '110px' }}>מועד פקיעה</th>
                <th style={{ minWidth: '90px' }}>בר-איזון</th>
                <th style={{ minWidth: '70px' }}>% איזון</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const capitalGain = r.marketValue - r.costBasis
                const expectedTax = capitalGain > 0 ? capitalGain * r.taxRate / 100 : 0
                const netValue = r.marketValue - expectedTax
                const fmtVal = (n: number) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₪'
                return (
                  <tr key={r.id}>
                    <td>
                      <input type="text" className="input" value={r.name}
                        onChange={e => onUpdate(i, 'name', e.target.value)} placeholder="שם הנייר"
                        style={{ fontWeight: 600 }} />
                    </td>
                    <td>
                      <Sel value={r.securityType} onChange={v => onUpdate(i, 'securityType', v)} options={[
                        { value: 'stocks', label: 'מניות' },
                        { value: 'bonds', label: 'אג"ח' },
                        { value: 'fund', label: 'קרן נאמנות' },
                        { value: 'option', label: 'אופציה' },
                        { value: 'other', label: 'אחר' },
                      ]} />
                    </td>
                    <td>
                      <Sel value={r.party} onChange={v => onUpdate(i, 'party', v)} options={[
                        { value: 'A', label: 'צד א' },
                        { value: 'B', label: 'צד ב' },
                      ]} />
                    </td>
                    <td><NumCell value={r.marketValue} onChange={v => onUpdate(i, 'marketValue', v)} /></td>
                    <td><NumCell value={r.costBasis} onChange={v => onUpdate(i, 'costBasis', v)} /></td>
                    <td>
                      <div style={{
                        fontWeight: 600, fontSize: '13px', padding: '6px 8px', whiteSpace: 'nowrap',
                        direction: 'ltr', textAlign: 'left',
                        color: capitalGain >= 0 ? '#16a34a' : '#dc2626',
                      }}>
                        {fmtVal(capitalGain)}
                      </div>
                    </td>
                    <td><Inp type="number" value={r.taxRate} onChange={v => onUpdate(i, 'taxRate', Number(v))} dir="ltr" /></td>
                    <td>
                      <div style={{ fontSize: '13px', padding: '6px 8px', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'left', color: '#374151' }}>
                        {fmtVal(expectedTax)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px', padding: '6px 8px', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'left', color: '#1a1a2e' }}>
                        {fmtVal(netValue)}
                      </div>
                    </td>
                    <td><Inp type="date" value={r.expiryDate} onChange={v => onUpdate(i, 'expiryDate', v)} dir="ltr" /></td>
                    <td>
                      <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                        { value: 'balanceable', label: 'בר-איזון' },
                        { value: 'excluded', label: 'מוחרג' },
                      ]} />
                    </td>
                    <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                    <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── BankTable ────────────────────────────────────────────────────────────────

interface BankTableProps {
  rows: BankRow[]
  onUpdate: (idx: number, field: keyof BankRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function BankTable({ rows, onUpdate, onAdd, onRemove }: BankTableProps) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>חשבונות פיננסיים</h3>
        <button className="btn-primary" onClick={onAdd} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>+ הוסף שורה</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState label="חשבון פיננסי" onAdd={onAdd} />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '1300px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>שם החשבון / בנק</th>
                <th style={{ minWidth: '110px' }}>מספר חשבון</th>
                <th style={{ minWidth: '110px' }}>סוג חשבון</th>
                <th style={{ minWidth: '70px' }}>צד</th>
                <th style={{ minWidth: '80px' }}>מטבע</th>
                <th style={{ minWidth: '120px' }}>יתרה</th>
                <th style={{ minWidth: '80px' }}>שע"ח</th>
                <th style={{ minWidth: '120px' }}>שווי שקלי (₪)</th>
                <th style={{ minWidth: '110px' }}>תאריך נזילות</th>
                <th style={{ minWidth: '80px' }}>ריבית (%)</th>
                <th style={{ minWidth: '120px' }}>מסגרת מנוצלת (₪)</th>
                <th style={{ minWidth: '120px', fontWeight: 700 }}>יתרה נטו (₪)</th>
                <th style={{ minWidth: '90px' }}>בר-איזון</th>
                <th style={{ minWidth: '70px' }}>% איזון</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const shekelValue = r.balance * r.exchangeRate
                const netBalance = shekelValue - r.creditUsed
                const fmtVal = (n: number) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₪'
                return (
                  <tr key={r.id}>
                    <td>
                      <input type="text" className="input" value={r.name}
                        onChange={e => onUpdate(i, 'name', e.target.value)} placeholder="שם החשבון"
                        style={{ fontWeight: 600 }} />
                    </td>
                    <td>
                      <input type="text" className="input" value={r.accountNumber}
                        onChange={e => onUpdate(i, 'accountNumber', e.target.value)}
                        placeholder="000000" dir="ltr" style={{ textAlign: 'left' }} />
                    </td>
                    <td>
                      <Sel value={r.accountType} onChange={v => onUpdate(i, 'accountType', v)} options={[
                        { value: 'current', label: 'עו"ש' },
                        { value: 'deposit', label: 'פק"מ' },
                        { value: 'structured', label: 'פיקדון מובנה' },
                        { value: 'forex', label: 'מט"ח' },
                        { value: 'other', label: 'אחר' },
                      ]} />
                    </td>
                    <td>
                      <Sel value={r.party} onChange={v => onUpdate(i, 'party', v)} options={[
                        { value: 'A', label: 'צד א' },
                        { value: 'B', label: 'צד ב' },
                      ]} />
                    </td>
                    <td>
                      <Sel value={r.currency} onChange={v => onUpdate(i, 'currency', v)} options={[
                        { value: '₪', label: '₪ שקל' },
                        { value: '$', label: '$ דולר' },
                        { value: '€', label: '€ יורו' },
                        { value: 'other', label: 'אחר' },
                      ]} />
                    </td>
                    <td><NumCell value={r.balance} onChange={v => onUpdate(i, 'balance', v)} /></td>
                    <td>
                      {r.currency !== '₪' ? (
                        <Inp type="number" value={r.exchangeRate} onChange={v => onUpdate(i, 'exchangeRate', Number(v))} dir="ltr" />
                      ) : (
                        <span style={{ padding: '0 8px', color: '#9ca3af', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', padding: '6px 8px', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'left', color: '#374151' }}>
                        {fmtVal(shekelValue)}
                      </div>
                    </td>
                    <td><Inp type="date" value={r.liquidityDate} onChange={v => onUpdate(i, 'liquidityDate', v)} dir="ltr" /></td>
                    <td><Inp type="number" value={r.interestRate} onChange={v => onUpdate(i, 'interestRate', Number(v))} dir="ltr" /></td>
                    <td><NumCell value={r.creditUsed} onChange={v => onUpdate(i, 'creditUsed', v)} /></td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px', padding: '6px 8px', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'left', color: '#1a1a2e' }}>
                        {fmtVal(netBalance)}
                      </div>
                    </td>
                    <td>
                      <Sel value={r.balanceable} onChange={v => onUpdate(i, 'balanceable', v)} options={[
                        { value: 'balanceable', label: 'בר-איזון' },
                        { value: 'excluded', label: 'מוחרג' },
                      ]} />
                    </td>
                    <td><Inp type="number" value={r.balancePercent} onChange={v => onUpdate(i, 'balancePercent', Number(v))} dir="ltr" /></td>
                    <td><DeleteBtn onClick={() => onRemove(i)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'realEstate', label: 'נדל"ן' },
  { key: 'pension',    label: 'פנסיה וגמל' },
  { key: 'business',  label: 'עסק/חברה' },
  { key: 'securities', label: 'ניירות ערך' },
  { key: 'bank',       label: 'חשבון פיננסי' },
  { key: 'vehicles',  label: 'רכב' },
  { key: 'debts',     label: 'חובות' },
] as const

type TabKey = typeof TABS[number]['key']

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('realEstate')
  const [assets, setAssets] = useState<Assets>({
    realEstate: [], pension: [], business: [], financial: [], vehicles: [], debts: [],
    securities: [], bank: [],
  })
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      try {
        const loaded = await loadAssets(id)
        setAssets(loaded)
      } catch {
        // If no assets yet, start with empty state — that's fine
      } finally {
        setPageLoading(false)
      }
    })
  }, [id, router])

  // ─── Real estate handlers ─────────────────────────────────────────────────
  // Pattern: update local state immediately for instant UI feedback.
  // add/remove also fire a DB call right away.
  // Field edits are batched and sent to DB when the user clicks "Next".

  const addRE = useCallback(() => {
    const row = defaultRE()
    setAssets(prev => ({ ...prev, realEstate: [...prev.realEstate, row] }))
  }, [])

  const removeRE = useCallback((idx: number) => {
    setAssets(prev => {
      const row = prev.realEstate[idx]
      if (row) deleteAsset(row.id).catch(() => null)
      return { ...prev, realEstate: prev.realEstate.filter((_, i) => i !== idx) }
    })
  }, [])

  const updateRE = useCallback((idx: number, field: keyof RealEstateRow, val: string | number) =>
    setAssets(prev => ({
      ...prev,
      realEstate: prev.realEstate.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  , [])

  // ─── Pension handlers ─────────────────────────────────────────────────────

  const addPension = useCallback(() => {
    const row = defaultPension()
    setAssets(prev => ({ ...prev, pension: [...prev.pension, row] }))
  }, [])

  const removePension = useCallback((idx: number) => {
    setAssets(prev => {
      const row = prev.pension[idx]
      if (row) deleteAsset(row.id).catch(() => null)
      return { ...prev, pension: prev.pension.filter((_, i) => i !== idx) }
    })
  }, [])

  const updatePension = useCallback((idx: number, field: keyof PensionRow, val: string | number) =>
    setAssets(prev => ({
      ...prev,
      pension: prev.pension.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  , [])

  const importPension = useCallback((rows: PensionRow[]) => {
    setAssets(prev => ({ ...prev, pension: [...prev.pension, ...rows] }))
  }, [])

  // ─── Business handlers ────────────────────────────────────────────────────

  const addBusiness = useCallback(() => {
    const row = defaultBusiness()
    setAssets(prev => ({ ...prev, business: [...prev.business, row] }))
  }, [])

  const removeBusiness = useCallback((idx: number) => {
    setAssets(prev => {
      const row = prev.business[idx]
      if (row) deleteAsset(row.id).catch(() => null)
      return { ...prev, business: prev.business.filter((_, i) => i !== idx) }
    })
  }, [])

  const updateBusiness = useCallback((idx: number, field: keyof BusinessRow, val: string | number | boolean) =>
    setAssets(prev => ({
      ...prev,
      business: prev.business.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  , [])

  // ─── Simple category handlers (vehicles / debts) ────────────────────────

  const makeSimpleHandlers = useCallback((category: 'financial' | 'vehicles' | 'debts') => ({
    onAdd: () => {
      const row = defaultSimple()
      setAssets(prev => ({ ...prev, [category]: [...prev[category], row] }))
    },
    onRemove: (idx: number) => {
      setAssets(prev => {
        const row = prev[category][idx]
        if (row) deleteAsset(row.id).catch(() => null)
        return { ...prev, [category]: prev[category].filter((_, i) => i !== idx) }
      })
    },
    onUpdate: (idx: number, field: keyof SimpleRow, val: string | number) => {
      setAssets(prev => ({
        ...prev,
        [category]: prev[category].map((r, i) => i === idx ? { ...r, [field]: val } : r),
      }))
    },
  }), [])

  const vehiclesHandlers = makeSimpleHandlers('vehicles')
  const debtsHandlers    = makeSimpleHandlers('debts')

  // ─── Securities handlers ──────────────────────────────────────────────────

  const addSecurities = useCallback(() => {
    setAssets(prev => ({ ...prev, securities: [...prev.securities, defaultSecurities()] }))
  }, [])
  const removeSecurities = useCallback((idx: number) => {
    setAssets(prev => {
      const row = prev.securities[idx]
      if (row) deleteAsset(row.id).catch(() => null)
      return { ...prev, securities: prev.securities.filter((_, i) => i !== idx) }
    })
  }, [])
  const updateSecurities = useCallback((idx: number, field: keyof SecuritiesRow, val: string | number) =>
    setAssets(prev => ({
      ...prev,
      securities: prev.securities.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  , [])

  // ─── Bank handlers ────────────────────────────────────────────────────────

  const addBank = useCallback(() => {
    setAssets(prev => ({ ...prev, bank: [...prev.bank, defaultBank()] }))
  }, [])
  const removeBank = useCallback((idx: number) => {
    setAssets(prev => {
      const row = prev.bank[idx]
      if (row) deleteAsset(row.id).catch(() => null)
      return { ...prev, bank: prev.bank.filter((_, i) => i !== idx) }
    })
  }, [])
  const updateBank = useCallback((idx: number, field: keyof BankRow, val: string | number) =>
    setAssets(prev => ({
      ...prev,
      bank: prev.bank.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  , [])

  // ─── Save to Supabase and navigate ───────────────────────────────────────

  const handleNext = async () => {
    setSaveError('')
    setSaving(true)
    try {
      await saveAssets(id, assets)
      router.push(`/cases/${id}/summary`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'שגיאה בשמירת הנכסים')
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#6b7280' }}>טוען נכסים...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem',
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <span style={{
            fontWeight: '800', fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>ActuAi</span>
        </Link>
        <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
          ← חזור ללוח הבקרה
        </button>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator step={2} />

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1f2937', margin: '0 0 0.25rem 0' }}>
              ניהול נכסים
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
              שלב 2 מתוך 3 — הוסף נכסים לפי קטגוריה
            </p>
          </div>

          {/* Tabs */}
          <div className="tab-list" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {assets[t.key].length > 0 && (
                  <span style={{
                    marginRight: '0.375rem',
                    background: activeTab === t.key ? '#6366f1' : '#e5e7eb',
                    color: activeTab === t.key ? 'white' : '#6b7280',
                    borderRadius: '9999px', padding: '0 0.375rem',
                    fontSize: '0.7rem', fontWeight: '700',
                  }}>
                    {assets[t.key].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content — each branch renders a stable module-level component */}
          <div style={{ minHeight: '300px' }}>
            {activeTab === 'realEstate' && (
              <RealEstateTable
                rows={assets.realEstate}
                onUpdate={updateRE}
                onAdd={addRE}
                onRemove={removeRE}
              />
            )}
            {activeTab === 'pension' && (
              <PensionTable
                rows={assets.pension}
                onUpdate={updatePension}
                onAdd={addPension}
                onRemove={removePension}
                onImport={importPension}
              />
            )}
            {activeTab === 'business' && (
              <BusinessTable
                rows={assets.business}
                onUpdate={updateBusiness}
                onAdd={addBusiness}
                onRemove={removeBusiness}
              />
            )}
            {activeTab === 'securities' && (
              <SecuritiesTable
                rows={assets.securities}
                onUpdate={updateSecurities}
                onAdd={addSecurities}
                onRemove={removeSecurities}
              />
            )}
            {activeTab === 'bank' && (
              <BankTable
                rows={assets.bank}
                onUpdate={updateBank}
                onAdd={addBank}
                onRemove={removeBank}
              />
            )}
            {activeTab === 'vehicles' && (
              <SimpleTable title="רכבים" rows={assets.vehicles} {...vehiclesHandlers} />
            )}
            {activeTab === 'debts' && (
              <SimpleTable title="חובות" rows={assets.debts} {...debtsHandlers} />
            )}
          </div>

          {/* Navigation */}
          {saveError && <div className="alert-error" style={{ marginTop: '1rem' }}>{saveError}</div>}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb',
          }}>
            <button className="btn-secondary" onClick={() => router.push('/dashboard')}>
              ← חזור ללוח הבקרה
            </button>
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={saving}
              style={{ padding: '0.75rem 2rem' }}
            >
              {saving ? 'שומר...' : 'הבא — סיכום ←'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
