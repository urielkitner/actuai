'use client'

import { useState, useEffect, use } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadAssets } from '@/lib/db'
import type { Assets, SimpleRow } from '@/lib/db'

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
              <span style={{ fontSize: '0.75rem', color: state === 'inactive' ? '#9ca3af' : '#374151', fontWeight: state === 'active' ? '600' : '400', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line ${num < step ? 'completed' : 'inactive'}`} style={{ margin: '0 0.5rem', marginTop: '-1.25rem' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>אין נכסים להצגה</div>

  let cumulative = 0
  const paths: { d: string; color: string; label: string; value: number }[] = []
  const cx = 100, cy = 100, r = 80

  for (const sl of slices) {
    if (sl.value === 0) continue
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += sl.value
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = sl.value / total > 0.5 ? 1 : 0
    paths.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: sl.color, label: sl.label, value: sl.value,
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: p.color, flexShrink: 0 }} />
            <span style={{ color: '#374151', fontWeight: '500' }}>{p.label}</span>
            <span style={{ color: '#6b7280', marginRight: 'auto' }}>
              ₪{p.value.toLocaleString('he-IL')} ({Math.round(p.value / total * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface CaseInfo {
  caseNumber: string
  partyAName: string
  partyAIdNumber: string
  partyABirthDate: string
  partyBName: string
  partyBIdNumber: string
  partyBBirthDate: string
  marriageDate: string
  separationDate: string
}

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('he-IL') : '—'

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [assets, setAssets] = useState<Assets | null>(null)
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Admin settings
  const [reportOpening, setReportOpening] = useState('דוח איזון משאבים זה הוכן על ידי אקטואר מוסמך')
  const [reportDisclaimer, setReportDisclaimer] = useState('הערה: דוח זה מהווה חוות דעת מקצועית בלבד')
  const [actuaryNameSetting, setActuaryNameSetting] = useState('')
  const [actuaryLicenseSetting, setActuaryLicenseSetting] = useState('')

  // User profile
  const [userFullName, setUserFullName] = useState('')
  const [isIlaaMember, setIsIlaaMember] = useState(false)
  const [ilaaIdNumber, setIlaaIdNumber] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      try {
        const [loaded, caseRes, settingsRes, profileRes] = await Promise.all([
          loadAssets(id),
          supabase
            .from('cases')
            .select('case_number, party_a_name, party_a_id_number, party_a_birth_date, party_b_name, party_b_id_number, party_b_birth_date, marriage_date, separation_date')
            .eq('id', id)
            .single(),
          supabase
            .from('admin_settings')
            .select('key, value')
            .in('key', ['report_opening', 'report_disclaimer', 'actuary_name', 'actuary_license']),
          supabase
            .from('profiles')
            .select('full_name, is_ilaa_member, ilaa_id_number')
            .eq('id', session.user.id)
            .single(),
        ])

        setAssets(loaded)

        if (caseRes.data) {
          const c = caseRes.data
          setCaseInfo({
            caseNumber: c.case_number,
            partyAName: c.party_a_name,
            partyAIdNumber: c.party_a_id_number ?? '',
            partyABirthDate: c.party_a_birth_date ?? '',
            partyBName: c.party_b_name,
            partyBIdNumber: c.party_b_id_number ?? '',
            partyBBirthDate: c.party_b_birth_date ?? '',
            marriageDate: c.marriage_date ?? '',
            separationDate: c.separation_date ?? '',
          })
        }

        if (settingsRes.data) {
          type SettingRow = { key: string; value: string }
          const get = (k: string) => settingsRes.data.find((s: SettingRow) => s.key === k)?.value ?? ''
          const opening = get('report_opening')
          const disclaimer = get('report_disclaimer')
          if (opening) setReportOpening(opening)
          if (disclaimer) setReportDisclaimer(disclaimer)
          setActuaryNameSetting(get('actuary_name'))
          setActuaryLicenseSetting(get('actuary_license'))
        }

        if (profileRes.data) {
          const p = profileRes.data
          setUserFullName(p.full_name ?? '')
          setIsIlaaMember(p.is_ilaa_member ?? false)
          setIlaaIdNumber(p.ilaa_id_number ?? '')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנכסים')
      } finally {
        setLoading(false)
      }
    })
  }, [id, router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#6b7280' }}>טוען נתונים...</div>
      </div>
    )
  }

  if (error || !assets) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error || 'לא נמצאו נתונים'}</p>
          <button className="btn-primary" onClick={() => router.push(`/cases/${id}/assets`)}>
            חזור לנכסים
          </button>
        </div>
      </div>
    )
  }

  // ─── Calculations ──────────────────────────────────────────────────────────

  const calcREA = () => assets.realEstate.filter(r => r.balanceable === 'balanceable').reduce((s, r) => s + r.valueA * (r.balancePercent / 100), 0)
  const calcREB = () => assets.realEstate.filter(r => r.balanceable === 'balanceable').reduce((s, r) => s + r.valueB * (r.balancePercent / 100), 0)

  const calcPensionA = () => assets.pension.filter(p => p.party === 'A' && p.balanceable === 'balanceable').reduce((s, p) => s + p.balance * (p.marriagePeriodShare / 100) * (p.balancePercent / 100), 0)
  const calcPensionB = () => assets.pension.filter(p => p.party === 'B' && p.balanceable === 'balanceable').reduce((s, p) => s + p.balance * (p.marriagePeriodShare / 100) * (p.balancePercent / 100), 0)

  const calcBizA = () => assets.business.filter(b => b.party === 'A' && b.balanceable === 'balanceable').reduce((s, b) => s + b.value * (b.ownershipPercent / 100) * (b.balancePercent / 100), 0)
  const calcBizB = () => assets.business.filter(b => b.party === 'B' && b.balanceable === 'balanceable').reduce((s, b) => s + b.value * (b.ownershipPercent / 100) * (b.balancePercent / 100), 0)

  const calcSimpleA = (cat: SimpleRow[]) => cat.filter(r => r.balanceable === 'balanceable').reduce((s, r) => s + r.valueA * (r.balancePercent / 100), 0)
  const calcSimpleB = (cat: SimpleRow[]) => cat.filter(r => r.balanceable === 'balanceable').reduce((s, r) => s + r.valueB * (r.balancePercent / 100), 0)

  const calcVehicleA = () => assets.vehicles.filter(v => v.party === 'A' && v.balanceable === 'balanceable').reduce((s, v) => s + v.marketValue * (v.balancePercent / 100), 0)
  const calcVehicleB = () => assets.vehicles.filter(v => v.party === 'B' && v.balanceable === 'balanceable').reduce((s, v) => s + v.marketValue * (v.balancePercent / 100), 0)

  const totalA = calcREA() + calcPensionA() + calcBizA() + calcSimpleA(assets.financial) + calcVehicleA() - calcSimpleA(assets.debts)
  const totalB = calcREB() + calcPensionB() + calcBizB() + calcSimpleB(assets.financial) + calcVehicleB() - calcSimpleB(assets.debts)

  const gap = Math.abs(totalA - totalB)
  const balancePayment = gap / 2
  const payerSide = totalA > totalB ? 'א' : 'ב'
  const receiverSide = totalA > totalB ? 'ב' : 'א'

  const fmt = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
  const categories = [
    { label: 'נדל"ן',      valueA: calcREA(),                           valueB: calcREB() },
    { label: 'פנסיה וגמל', valueA: calcPensionA(),                      valueB: calcPensionB() },
    { label: 'עסק/חברה',   valueA: calcBizA(),                          valueB: calcBizB() },
    { label: 'פיננסי',     valueA: calcSimpleA(assets.financial),       valueB: calcSimpleB(assets.financial) },
    { label: 'רכב',        valueA: calcVehicleA(),                      valueB: calcVehicleB() },
  ].filter(c => c.valueA + c.valueB > 0)

  const pieSlices = [
    { label: 'צד א — נדל"ן',   value: calcREA(),                     color: '#6366f1' },
    { label: 'צד ב — נדל"ן',   value: calcREB(),                     color: '#818cf8' },
    { label: 'צד א — פנסיה',   value: calcPensionA(),                color: '#8b5cf6' },
    { label: 'צד ב — פנסיה',   value: calcPensionB(),                color: '#a78bfa' },
    { label: 'צד א — עסק',     value: calcBizA(),                    color: '#06b6d4' },
    { label: 'צד ב — עסק',     value: calcBizB(),                    color: '#67e8f9' },
    { label: 'צד א — פיננסי',  value: calcSimpleA(assets.financial), color: '#10b981' },
    { label: 'צד ב — פיננסי',  value: calcSimpleB(assets.financial), color: '#6ee7b7' },
    { label: 'צד א — רכב',     value: calcVehicleA(),                color: '#f59e0b' },
    { label: 'צד ב — רכב',     value: calcVehicleB(),                color: '#fcd34d' },
  ].filter(s => s.value > 0)

  // ─── Derived actuary info ──────────────────────────────────────────────────

  const actuaryName = actuaryNameSetting || userFullName
  const actuaryLicense = actuaryLicenseSetting || (isIlaaMember ? ilaaIdNumber : '')
  const today = new Date().toLocaleDateString('he-IL')

  // ─── Assets detail rows for print ─────────────────────────────────────────

  type DetailRow = { category: string; name: string; party: string; value: number; balanceable: string; equalized: number }
  const detailRows: DetailRow[] = []

  for (const r of assets.realEstate) {
    if (r.valueA) detailRows.push({ category: 'נדל"ן', name: r.name, party: 'א', value: r.valueA, balanceable: r.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: r.balanceable === 'balanceable' ? Math.round(r.valueA * r.balancePercent / 100) : 0 })
    if (r.valueB) detailRows.push({ category: 'נדל"ן', name: r.name, party: 'ב', value: r.valueB, balanceable: r.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: r.balanceable === 'balanceable' ? Math.round(r.valueB * r.balancePercent / 100) : 0 })
  }
  for (const p of assets.pension) {
    const v = Math.round(p.balance * (p.marriagePeriodShare / 100))
    detailRows.push({ category: 'פנסיה וגמל', name: p.fundName, party: p.party === 'A' ? 'א' : 'ב', value: v, balanceable: p.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: p.balanceable === 'balanceable' ? Math.round(v * p.balancePercent / 100) : 0 })
  }
  for (const b of assets.business) {
    const v = Math.round(b.value * (b.ownershipPercent / 100))
    detailRows.push({ category: 'עסק/חברה', name: b.companyName, party: b.party === 'A' ? 'א' : 'ב', value: v, balanceable: b.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: b.balanceable === 'balanceable' ? Math.round(v * b.balancePercent / 100) : 0 })
  }
  for (const f of assets.financial) {
    if (f.valueA) detailRows.push({ category: 'פיננסי', name: f.name, party: 'א', value: f.valueA, balanceable: f.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: f.balanceable === 'balanceable' ? Math.round(f.valueA * f.balancePercent / 100) : 0 })
    if (f.valueB) detailRows.push({ category: 'פיננסי', name: f.name, party: 'ב', value: f.valueB, balanceable: f.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: f.balanceable === 'balanceable' ? Math.round(f.valueB * f.balancePercent / 100) : 0 })
  }
  for (const v of assets.vehicles) {
    const name = [v.manufacturer, v.model].filter(Boolean).join(' ') || v.licensePlate
    detailRows.push({ category: 'רכב', name, party: v.party === 'A' ? 'א' : 'ב', value: v.marketValue, balanceable: v.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: v.balanceable === 'balanceable' ? Math.round(v.marketValue * v.balancePercent / 100) : 0 })
  }
  for (const d of assets.debts) {
    if (d.valueA) detailRows.push({ category: 'חובות', name: d.name, party: 'א', value: -d.valueA, balanceable: d.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: d.balanceable === 'balanceable' ? Math.round(-d.valueA * d.balancePercent / 100) : 0 })
    if (d.valueB) detailRows.push({ category: 'חובות', name: d.name, party: 'ב', value: -d.valueB, balanceable: d.balanceable === 'balanceable' ? 'כן' : 'לא', equalized: d.balanceable === 'balanceable' ? Math.round(-d.valueB * d.balancePercent / 100) : 0 })
  }

  // ─── Export handlers ───────────────────────────────────────────────────────

  const handlePdfExport = () => {
    window.print()
  }

  const handleExcelExport = async () => {
    const { utils, writeFile } = await import('xlsx')

    const safeDate = today.replace(/\//g, '-')
    const safeCaseNum = (caseInfo?.caseNumber ?? id).replace(/[/\\:*?"<>|]/g, '_')
    const fileName = `איזון_${safeCaseNum}_${safeDate}.xlsx`

    const wb = utils.book_new()

    const summaryRows: (string | number)[][] = [
      ['מספר תיק', caseInfo?.caseNumber ?? id],
      ['צד א', caseInfo?.partyAName ?? ''],
      ['צד ב', caseInfo?.partyBName ?? ''],
      ['תאריך הדוח', today],
      [],
      ['סיכום נכסים'],
      ['סך נכסי צד א', Math.round(totalA)],
      ['סך נכסי צד ב', Math.round(totalB)],
      ['פער', Math.round(gap)],
      ['תשלום מאזן', Math.round(balancePayment)],
      [],
      ['פתיח הדוח', reportOpening],
    ]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(summaryRows), 'סיכום')

    const excelDetailRows: (string | number)[][] = [
      ['קטגוריה', 'שם נכס', 'צד', 'שווי', 'בר-איזון', 'שווי לאיזון'],
      ...detailRows.map(r => [r.category, r.name, r.party, r.value, r.balanceable, r.equalized]),
    ]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(excelDetailRows), 'פירוט')

    writeFile(wb, fileName)
  }

  // ─── Print report (portal to body) ────────────────────────────────────────

  const printReport = createPortal(
    <div id="print-report">
      {/* ── Header ── */}
      <div style={{ borderBottom: '3px solid #6366f1', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#6366f1', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>ActuAi</div>
        <div style={{ fontSize: '1.375rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>דוח איזון משאבים</div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>תאריך הפקה: {today}</div>
      </div>

      {/* ── Actuary section ── */}
      {(actuaryName || actuaryLicense) && (
        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {actuaryName && <div><strong>נערך על ידי:</strong> {actuaryName}</div>}
          {actuaryLicense && <div><strong>מספר רישיון ILAA:</strong> {actuaryLicense}</div>}
        </div>
      )}

      {/* ── Opening text ── */}
      <p style={{ color: '#374151', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.6' }}>{reportOpening}</p>

      {/* ── Case details ── */}
      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>פרטי התיק</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
        <tbody>
          <tr>
            <th style={{ padding: '5px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', width: '20%', fontWeight: '600', fontSize: '0.8rem' }}>מספר תיק</th>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.875rem' }} colSpan={3}>{caseInfo?.caseNumber ?? id}</td>
          </tr>
          <tr>
            <th style={{ padding: '5px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', fontWeight: '600', fontSize: '0.8rem' }}>צד א&apos;</th>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.875rem' }}>
              {caseInfo?.partyAName}
              {caseInfo?.partyAIdNumber && <span style={{ color: '#6b7280', marginRight: '1rem' }}>ת.ז: {caseInfo.partyAIdNumber}</span>}
              {caseInfo?.partyABirthDate && <span style={{ color: '#6b7280', marginRight: '1rem' }}>ת. לידה: {fmtDate(caseInfo.partyABirthDate)}</span>}
            </td>
            <th style={{ padding: '5px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', fontWeight: '600', fontSize: '0.8rem', width: '15%' }}>תאריך נישואין</th>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.875rem', width: '20%' }}>{fmtDate(caseInfo?.marriageDate ?? '')}</td>
          </tr>
          <tr>
            <th style={{ padding: '5px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', fontWeight: '600', fontSize: '0.8rem' }}>צד ב&apos;</th>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.875rem' }}>
              {caseInfo?.partyBName}
              {caseInfo?.partyBIdNumber && <span style={{ color: '#6b7280', marginRight: '1rem' }}>ת.ז: {caseInfo.partyBIdNumber}</span>}
              {caseInfo?.partyBBirthDate && <span style={{ color: '#6b7280', marginRight: '1rem' }}>ת. לידה: {fmtDate(caseInfo.partyBBirthDate)}</span>}
            </td>
            <th style={{ padding: '5px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', fontWeight: '600', fontSize: '0.8rem' }}>תאריך פרידה</th>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.875rem' }}>{fmtDate(caseInfo?.separationDate ?? '')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Summary table by category ── */}
      {categories.length > 0 && (
        <>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>סיכום לפי קטגוריה</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right' }}>קטגוריה</th>
                <th style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right' }}>סך צד א</th>
                <th style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right' }}>סך צד ב</th>
                <th style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right' }}>פער</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{cat.label}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(cat.valueA)}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(cat.valueB)}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(Math.abs(cat.valueA - cat.valueB))}</td>
                </tr>
              ))}
              <tr style={{ background: '#f3f4f6', fontWeight: '700' }}>
                <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>סה&quot;כ</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', color: '#6366f1' }}>{fmt(totalA)}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', color: '#8b5cf6' }}>{fmt(totalB)}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(gap)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ── Equalization section ── */}
      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>חישוב איזון משאבים</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
        <tbody>
          {([
            ['סך נכסי צד א', fmt(totalA)],
            ['סך נכסי צד ב', fmt(totalB)],
            ['פער בין הצדדים', fmt(gap)],
            [`תשלום מאזן (מצד ${payerSide} לצד ${receiverSide})`, fmt(balancePayment)],
          ] as [string, string][]).map(([label, value]) => (
            <tr key={label}>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', width: '60%', fontWeight: '600' }}>{label}</th>
              <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '700', color: '#6366f1' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Assets detail table ── */}
      {detailRows.length > 0 && (
        <>
          <div className="page-break" />
          <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>פירוט נכסים</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                {['קטגוריה', 'שם נכס', 'צד', 'שווי', 'בר-איזון', 'שווי לאיזון'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f3f4f6', textAlign: 'right', fontSize: '0.8rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.8rem' }}>{r.category}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.8rem' }}>{r.name}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '0.8rem' }}>{r.party}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.8rem' }}>{fmt(r.value)}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '0.8rem' }}>{r.balanceable}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.8rem', fontWeight: '600', color: '#6366f1' }}>{fmt(r.equalized)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Disclaimer ── */}
      <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '1rem', marginTop: '1rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1rem 0', lineHeight: '1.6' }}>{reportDisclaimer}</p>
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>
          הופק באמצעות ActuAi · tryactuai.com · {today}
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      {/* ── Print CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap');
        #print-report { display: none; }
        @media print {
          body > * { display: none !important; }
          #print-report {
            display: block !important;
            direction: rtl;
            font-family: 'Heebo', 'Segoe UI', Tahoma, Arial, sans-serif;
            color: #000;
            background: #fff;
            padding: 2rem;
            box-sizing: border-box;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f3f4f6; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* ── Portal to body ── */}
      {printReport}

      {/* ── Page UI ── */}
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <img src="/logo.png" alt="ActuAi logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span style={{ fontWeight: '800', fontSize: '1.125rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ActuAi</span>
          </Link>
          <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
            ← חזור ללוח הבקרה
          </button>
        </nav>

        {/* Sticky case info bar */}
        {caseInfo && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'white', borderBottom: '1px solid #e5e7eb',
            padding: '8px 24px',
            display: 'flex', alignItems: 'center', gap: '0',
            direction: 'rtl', fontSize: '13px', color: '#6b7280',
            fontFamily: 'Heebo, sans-serif',
          }}>
            <span>מספר תיק:&nbsp;<span style={{ color: '#1a1a2e', fontWeight: 600 }}>{caseInfo.caseNumber}</span></span>
            <span style={{ margin: '0 10px', color: '#e5e7eb' }}>|</span>
            <span>צד א׳:&nbsp;<span style={{ color: '#1a1a2e', fontWeight: 600 }}>{caseInfo.partyAName}</span></span>
            <span style={{ margin: '0 10px', color: '#e5e7eb' }}>|</span>
            <span>צד ב׳:&nbsp;<span style={{ color: '#1a1a2e', fontWeight: 600 }}>{caseInfo.partyBName}</span></span>
          </div>
        )}

        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <StepIndicator step={3} />

          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1f2937', margin: '0 0 0.25rem 0' }}>
            סיכום איזון משאבים
          </h1>
          <p style={{ color: '#6b7280', margin: '0 0 1.5rem 0', fontSize: '0.875rem' }}>שלב 3 מתוך 3</p>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <SummaryCard label="סך נכסי צד א"             value={fmt(totalA)}        color="#6366f1" icon="👤" />
            <SummaryCard label="סך נכסי צד ב"             value={fmt(totalB)}        color="#8b5cf6" icon="👤" />
            <SummaryCard label="פער בין הצדדים"           value={fmt(gap)}           color="#f59e0b" icon="⚖️" />
            <SummaryCard label={`תשלום מאזן (מצד ${payerSide})`} value={fmt(balancePayment)} color="#10b981" icon="💰" />
          </div>

          {/* Breakdown table */}
          {categories.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: '0 0 1rem 0' }}>
                פירוט לפי קטגוריה
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>קטגוריה</th><th>צד א (₪)</th><th>צד ב (₪)</th><th>סה&quot;כ (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
                            {cat.label}
                          </div>
                        </td>
                        <td style={{ fontWeight: '500' }}>{fmt(cat.valueA)}</td>
                        <td style={{ fontWeight: '500' }}>{fmt(cat.valueB)}</td>
                        <td style={{ fontWeight: '700', color: '#6366f1' }}>{fmt(cat.valueA + cat.valueB)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ fontWeight: '700' }}>סה&quot;כ</td>
                      <td style={{ fontWeight: '700', color: '#6366f1' }}>{fmt(totalA)}</td>
                      <td style={{ fontWeight: '700', color: '#8b5cf6' }}>{fmt(totalB)}</td>
                      <td style={{ fontWeight: '700', color: '#1f2937' }}>{fmt(totalA + totalB)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pie chart */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: '0 0 1.5rem 0' }}>
              התפלגות נכסים
            </h2>
            <PieChart slices={pieSlices} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <button
              className="btn-primary"
              onClick={handlePdfExport}
              style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              📄 הפק דוח PDF
            </button>
            <button
              className="btn-secondary"
              onClick={handleExcelExport}
              style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              📊 הפק דוח Excel
            </button>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={() => router.push(`/cases/${id}/assets`)}>
              ← חזור לנכסים
            </button>
            <button className="btn-primary" onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem' }}>
              סיים וחזור ללוח הבקרה
            </button>
          </div>
        </main>
      </div>
    </>
  )
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.375rem', fontWeight: '800', color, marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{label}</div>
    </div>
  )
}
