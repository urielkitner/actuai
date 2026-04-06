'use client'

import { useState, useEffect, use } from 'react'
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

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [assets, setAssets] = useState<Assets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      try {
        const loaded = await loadAssets(id)
        setAssets(loaded)
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

  const totalA = calcREA() + calcPensionA() + calcBizA() + calcSimpleA(assets.financial) + calcSimpleA(assets.vehicles) - calcSimpleA(assets.debts)
  const totalB = calcREB() + calcPensionB() + calcBizB() + calcSimpleB(assets.financial) + calcSimpleB(assets.vehicles) - calcSimpleB(assets.debts)

  const gap = Math.abs(totalA - totalB)
  const balancePayment = gap / 2
  const payerSide = totalA > totalB ? 'א' : 'ב'

  const fmt = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
  const categories = [
    { label: 'נדל"ן',      valueA: calcREA(),                           valueB: calcREB() },
    { label: 'פנסיה וגמל', valueA: calcPensionA(),                      valueB: calcPensionB() },
    { label: 'עסק/חברה',   valueA: calcBizA(),                          valueB: calcBizB() },
    { label: 'פיננסי',     valueA: calcSimpleA(assets.financial),       valueB: calcSimpleB(assets.financial) },
    { label: 'רכב',        valueA: calcSimpleA(assets.vehicles),        valueB: calcSimpleB(assets.vehicles) },
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
    { label: 'צד א — רכב',     value: calcSimpleA(assets.vehicles),  color: '#f59e0b' },
    { label: 'צד ב — רכב',     value: calcSimpleB(assets.vehicles),  color: '#fcd34d' },
  ].filter(s => s.value > 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <span style={{ fontWeight: '800', fontSize: '1.125rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ActuAi</span>
        </Link>
        <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
          ← חזור ללוח הבקרה
        </button>
      </nav>

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
            onClick={() => alert('פונקציית ייצוא PDF תהיה זמינה בקרוב')}
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            📄 הפק דוח PDF
          </button>
          <button
            className="btn-secondary"
            onClick={() => alert('פונקציית ייצוא Excel תהיה זמינה בקרוב')}
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
