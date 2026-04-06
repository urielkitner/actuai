'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadAssets, saveAssets, deleteAsset } from '@/lib/db'
import type { Assets, RealEstateRow, PensionRow, BusinessRow, SimpleRow } from '@/lib/db'

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
})
const defaultBusiness = (): BusinessRow => ({
  id: crypto.randomUUID(), companyName: '', ownershipPercent: 100, value: 0,
  appraised: false, foundedDate: '', party: 'A', balanceable: 'balanceable', balancePercent: 50,
})
const defaultSimple = (): SimpleRow => ({
  id: crypto.randomUUID(), name: '', valueA: 0, valueB: 0, balanceable: 'balanceable', balancePercent: 50,
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

interface PensionTableProps {
  rows: PensionRow[]
  onUpdate: (idx: number, field: keyof PensionRow, val: string | number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

function PensionTable({ rows, onUpdate, onAdd, onRemove }: PensionTableProps) {
  return (
    <>
      <SectionHeader title="קרנות פנסיה וחסכון" onAdd={onAdd} />
      {rows.length === 0 ? (
        <EmptyState label="פנסיה" onAdd={onAdd} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם קרן</th><th>סוג מוצר</th><th>תאריך תחילה</th>
                <th>יתרה (₪)</th><th>% נישואין</th><th>צד</th>
                <th>בר-איזון</th><th>% איזון</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td><Inp value={r.fundName} onChange={v => onUpdate(i, 'fundName', v)} placeholder="שם הקרן" /></td>
                  <td>
                    <Sel value={r.productType} onChange={v => onUpdate(i, 'productType', v)} options={[
                      { value: 'pension', label: 'פנסיה' },
                      { value: 'gemel', label: 'גמל' },
                      { value: 'hishtalmut', label: 'השתלמות' },
                      { value: 'military', label: 'צבאית' },
                      { value: 'governmental', label: 'ממשלתית' },
                    ]} />
                  </td>
                  <td><Inp type="date" value={r.startDate} onChange={v => onUpdate(i, 'startDate', v)} dir="ltr" /></td>
                  <td><Inp type="number" value={r.balance} onChange={v => onUpdate(i, 'balance', Number(v))} dir="ltr" /></td>
                  <td><Inp type="number" value={r.marriagePeriodShare} onChange={v => onUpdate(i, 'marriagePeriodShare', Number(v))} dir="ltr" /></td>
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
                <th>שם חברה</th><th>% בעלות</th><th>שווי (₪)</th>
                <th>הוערך ע&quot;י שמאי</th><th>תאריך הקמה</th><th>צד</th>
                <th>בר-איזון</th><th>% איזון</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td><Inp value={r.companyName} onChange={v => onUpdate(i, 'companyName', v)} placeholder="שם החברה" /></td>
                  <td><Inp type="number" value={r.ownershipPercent} onChange={v => onUpdate(i, 'ownershipPercent', Number(v))} dir="ltr" /></td>
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
              ))}
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

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'realEstate', label: 'נדל"ן' },
  { key: 'pension',    label: 'פנסיה וגמל' },
  { key: 'business',  label: 'עסק/חברה' },
  { key: 'financial', label: 'פיננסי' },
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

  // ─── Simple category handlers (financial / vehicles / debts) ─────────────

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

  const financialHandlers = makeSimpleHandlers('financial')
  const vehiclesHandlers  = makeSimpleHandlers('vehicles')
  const debtsHandlers     = makeSimpleHandlers('debts')

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
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}
          onClick={() => router.push('/dashboard')}
        >
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
        </div>
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
            {activeTab === 'financial' && (
              <SimpleTable title="נכסים פיננסיים" rows={assets.financial} {...financialHandlers} />
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
