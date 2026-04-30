'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { createCase, nextCaseNumber } from '@/lib/db'

// ─── DatePicker ───────────────────────────────────────────────────────────────

const MONTHS_HE_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
const MONTHS_HE_FULL  = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const WEEKDAYS_HE     = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MIN_YEAR = 1935
const MAX_YEAR = 2026

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate()
}

function groupOf(year: number) {
  return Math.floor((year - MIN_YEAR) / 12) * 12 + MIN_YEAR
}

function parseISO(v: string): { y: number | null; m: number | null; d: number | null } {
  if (!v || v.length < 10) return { y: null, m: null, d: null }
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return { y: null, m: null, d: null }
  return { y, m, d }
}

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
}

function DatePicker({ value, onChange, placeholder = 'בחר תאריך' }: DatePickerProps) {
  const { y: initY, m: initM, d: initD } = parseISO(value)

  const [open, setOpen]         = useState(false)
  const [step, setStep]         = useState<'year' | 'month' | 'day'>('year')
  const [selYear, setSelYear]   = useState<number | null>(initY)
  const [selMonth, setSelMonth] = useState<number | null>(initM)
  const [selDay, setSelDay]     = useState<number | null>(initD)
  const [groupStart, setGroupStart] = useState(() => groupOf(initY ?? new Date().getFullYear()))
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync when value changes externally
  useEffect(() => {
    const { y, m, d } = parseISO(value)
    setSelYear(y); setSelMonth(m); setSelDay(d)
    if (y) setGroupStart(groupOf(y))
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const openPicker = () => {
    if (selYear) setGroupStart(groupOf(selYear))
    setStep('year')
    setOpen(true)
  }

  const displayValue = () => {
    if (!selYear || !selMonth || !selDay) return ''
    return `${String(selDay).padStart(2, '0')}/${String(selMonth).padStart(2, '0')}/${selYear}`
  }

  const headerText = () => {
    if (selYear && selMonth && selDay) {
      const wd = WEEKDAYS_HE[new Date(selYear, selMonth - 1, selDay).getDay()]
      return `יום ${wd} ${selDay} ${MONTHS_HE_FULL[selMonth - 1]} ${selYear}`
    }
    if (selYear && selMonth) return `${MONTHS_HE_FULL[selMonth - 1]} ${selYear}`
    if (selYear) return `${selYear}`
    return 'בחר תאריך'
  }

  const selectYear = (y: number) => { setSelYear(y); setSelMonth(null); setSelDay(null); setStep('month') }
  const selectMonth = (m: number) => { setSelMonth(m); setSelDay(null); setStep('day') }
  const selectDay = (d: number) => {
    setSelDay(d)
    onChange(`${selYear}-${String(selMonth!).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    setOpen(false)
  }

  const goBack = () => {
    if (step === 'day') setStep('month')
    else if (step === 'month') setStep('year')
  }

  const years = Array.from({ length: 12 }, (_, i) => groupStart + i).filter(y => y >= MIN_YEAR && y <= MAX_YEAR)
  const canPrev = groupStart - 12 >= MIN_YEAR
  const canNext = groupStart + 12 <= MAX_YEAR

  // Day grid: null = empty cell, number = day
  const dayGrid = (): (number | null)[] => {
    if (!selYear || !selMonth) return []
    const total = daysInMonth(selYear, selMonth)
    const start = new Date(selYear, selMonth - 1, 1).getDay() // 0=Sunday
    const cells: (number | null)[] = Array(start).fill(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const btnBase: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif", borderRadius: '8px',
    transition: 'background 0.1s',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', direction: 'rtl' }}>
      {/* Trigger input */}
      <input
        type="text"
        className="input"
        readOnly
        value={displayValue()}
        placeholder={placeholder}
        onClick={openPicker}
        style={{ cursor: 'pointer', caretColor: 'transparent' }}
      />

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 1000,
          width: '320px', background: 'white', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          fontFamily: "'Heebo', sans-serif", overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px', background: '#4f46e5', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            direction: 'rtl',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{headerText()}</span>
            {step !== 'year' && (
              <button
                type="button"
                onClick={goBack}
                style={{ ...btnBase, color: 'white', fontSize: '14px', padding: '2px 6px', marginRight: '0' }}
                title="חזור"
              >
                ▼
              </button>
            )}
          </div>

          <div style={{ padding: '12px' }}>

            {/* ── YEAR ── */}
            {step === 'year' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', direction: 'rtl' }}>
                  <button type="button" onClick={() => canPrev && setGroupStart(g => g - 12)}
                    style={{ ...btnBase, fontSize: '14px', padding: '4px 8px', color: canPrev ? '#374151' : '#d1d5db', cursor: canPrev ? 'pointer' : 'not-allowed' }}>
                    ▲
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    {years[0]} — {years[years.length - 1]}
                  </span>
                  <button type="button" onClick={() => canNext && setGroupStart(g => g + 12)}
                    style={{ ...btnBase, fontSize: '14px', padding: '4px 8px', color: canNext ? '#374151' : '#d1d5db', cursor: canNext ? 'pointer' : 'not-allowed' }}>
                    ▼
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {years.map(y => {
                    const isSel = selYear === y
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => selectYear(y)}
                        style={{
                          ...btnBase,
                          padding: '9px 4px',
                          background: isSel ? '#4f46e5' : 'transparent',
                          color: isSel ? 'white' : '#374151',
                          fontSize: '13px', fontWeight: isSel ? 700 : 400,
                          borderRadius: '50%',
                        }}
                        onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#f5f3ff' }}
                        onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── MONTH ── */}
            {step === 'month' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {MONTHS_HE_SHORT.map((label, i) => {
                  const isSel = selMonth === i + 1
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectMonth(i + 1)}
                      style={{
                        ...btnBase,
                        padding: '13px 4px',
                        background: isSel ? '#4f46e5' : 'transparent',
                        color: isSel ? 'white' : '#374151',
                        fontSize: '13px', fontWeight: isSel ? 700 : 400,
                      }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#f5f3ff' }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── DAY ── */}
            {step === 'day' && selYear && selMonth && (
              <>
                {/* Week header: א ב ג ד ה ו ש (Sun–Sat) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', padding: '3px 0' }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {dayGrid().map((day, i) => {
                    const isSel = day !== null && selDay === day
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => day !== null && selectDay(day)}
                        disabled={day === null}
                        style={{
                          ...btnBase,
                          width: '36px', height: '36px', margin: '0 auto',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          background: isSel ? '#4f46e5' : 'transparent',
                          color: day === null ? 'transparent' : isSel ? 'white' : '#374151',
                          fontSize: '12px', fontWeight: isSel ? 700 : 400,
                          cursor: day === null ? 'default' : 'pointer',
                        }}
                        onMouseEnter={e => { if (day !== null && !isSel) (e.currentTarget as HTMLElement).style.background = '#f5f3ff' }}
                        onMouseLeave={e => { if (day !== null && !isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        {day ?? ''}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── PartyForm ────────────────────────────────────────────────────────────────

interface PartyForm {
  fullName: string
  idNumber: string
  dateOfBirth: string
}

const emptyParty: PartyForm = { fullName: '', idNumber: '', dateOfBirth: '' }

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
              <span style={{ fontSize: '0.75rem', color: state === 'inactive' ? '#9ca3af' : '#374151', fontWeight: state === 'active' ? '600' : '400', whiteSpace: 'nowrap' }}>
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

// ─── NewCasePage ──────────────────────────────────────────────────────────────

export default function NewCasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [partyA, setPartyA] = useState<PartyForm>(emptyParty)
  const [partyB, setPartyB] = useState<PartyForm>(emptyParty)
  const [marriageDate, setMarriageDate] = useState('')
  const [separationDate, setSeparationDate] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.subscription_status === 'none') {
        const { count } = await supabase
          .from('cases')
          .select('id', { count: 'exact', head: true })
          .eq('actuary_id', session.user.id)

        if ((count ?? 0) >= 1) {
          router.replace('/pricing?message=' + encodeURIComponent('הגעת למגבלת התיק החינמי. שדרג למנוי כדי להמשיך'))
          return
        }
      }

      const suggested = await nextCaseNumber()
      setCaseNumber(suggested)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!caseNumber.trim()) { setError('אנא הזן מספר תיק'); return }
    if (!partyA.fullName || !partyA.idNumber || !partyA.dateOfBirth) { setError('אנא מלא את כל פרטי צד א'); return }
    if (!partyB.fullName || !partyB.idNumber || !partyB.dateOfBirth) { setError('אנא מלא את כל פרטי צד ב'); return }
    if (!marriageDate || !separationDate) { setError('אנא מלא תאריך נישואין ומועד הקרע'); return }

    setLoading(true)
    try {
      const caseId = await createCase({
        caseNumber: caseNumber.trim(),
        partyAName: partyA.fullName,
        partyAIdNumber: partyA.idNumber,
        partyABirthDate: partyA.dateOfBirth,
        partyBName: partyB.fullName,
        partyBIdNumber: partyB.idNumber,
        partyBBirthDate: partyB.dateOfBirth,
        marriageDate,
        separationDate,
      })
      router.push(`/cases/${caseId}/assets`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת התיק')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img src="/logo.png" alt="ActuAi logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <span style={{ fontWeight: '800', fontSize: '1.125rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ActuAi
          </span>
        </Link>
        <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
          ← חזור ללוח הבקרה
        </button>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator step={1} />

        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1f2937', margin: '0 0 0.375rem 0' }}>
            פרטי הצדדים
          </h1>
          <p style={{ color: '#6b7280', margin: '0 0 2rem 0', fontSize: '0.875rem' }}>
            שלב 1 מתוך 3 — הזן את פרטי שני הצדדים
          </p>

          {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Case Number */}
            <div style={{ marginBottom: '2rem' }}>
              <label className="label">מספר תיק</label>
              <input
                type="text"
                className="input"
                value={caseNumber}
                onChange={e => setCaseNumber(e.target.value)}
                placeholder="AC-2026-0001"
                dir="ltr"
                style={{ textAlign: 'left', fontFamily: 'monospace', fontWeight: '600' }}
                required
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
                מספר התיק נוצר אוטומטית — ניתן לשנות אותו ידנית
              </p>
            </div>

            {/* Party A */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)', borderRadius: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8125rem', fontWeight: '700' }}>א</div>
                <span style={{ fontWeight: '700', color: '#4338ca' }}>צד א</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">שם מלא</label>
                  <input type="text" className="input" placeholder="ישראל ישראלי" value={partyA.fullName} onChange={e => setPartyA({ ...partyA, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">תעודת זהות</label>
                  <input type="text" className="input" placeholder="000000000" value={partyA.idNumber} onChange={e => setPartyA({ ...partyA, idNumber: e.target.value })} maxLength={9} dir="ltr" style={{ textAlign: 'left' }} required />
                </div>
                <div>
                  <label className="label">תאריך לידה</label>
                  <DatePicker
                    value={partyA.dateOfBirth}
                    onChange={v => setPartyA({ ...partyA, dateOfBirth: v })}
                  />
                </div>
              </div>
            </div>

            {/* Party B */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)', borderRadius: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #a855f7, #ec4899)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8125rem', fontWeight: '700' }}>ב</div>
                <span style={{ fontWeight: '700', color: '#7e22ce' }}>צד ב</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">שם מלא</label>
                  <input type="text" className="input" placeholder="שרה ישראלי" value={partyB.fullName} onChange={e => setPartyB({ ...partyB, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">תעודת זהות</label>
                  <input type="text" className="input" placeholder="000000000" value={partyB.idNumber} onChange={e => setPartyB({ ...partyB, idNumber: e.target.value })} maxLength={9} dir="ltr" style={{ textAlign: 'left' }} required />
                </div>
                <div>
                  <label className="label">תאריך לידה</label>
                  <DatePicker
                    value={partyB.dateOfBirth}
                    onChange={v => setPartyB({ ...partyB, dateOfBirth: v })}
                  />
                </div>
              </div>
            </div>

            {/* Marriage / Separation dates */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#374151', margin: '0 0 1rem 0' }}>תאריכים</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">תאריך נישואין</label>
                  <DatePicker value={marriageDate} onChange={setMarriageDate} />
                </div>
                <div>
                  <label className="label">מועד הקרע</label>
                  <DatePicker value={separationDate} onChange={setSeparationDate} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem' }}>
                {loading ? 'שומר...' : 'הבא — ניהול נכסים ←'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
