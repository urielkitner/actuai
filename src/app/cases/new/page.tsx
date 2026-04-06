'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { createCase } from '@/lib/db'

interface PartyForm {
  fullName: string
  idNumber: string
  dateOfBirth: string
}

const emptyParty: PartyForm = { fullName: '', idNumber: '', dateOfBirth: '' }

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

export default function NewCasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [partyA, setPartyA] = useState<PartyForm>(emptyParty)
  const [partyB, setPartyB] = useState<PartyForm>(emptyParty)
  const [marriageDate, setMarriageDate] = useState('')
  const [separationDate, setSeparationDate] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!partyA.fullName || !partyA.idNumber || !partyA.dateOfBirth) {
      setError('אנא מלא את כל פרטי צד א')
      return
    }
    if (!partyB.fullName || !partyB.idNumber || !partyB.dateOfBirth) {
      setError('אנא מלא את כל פרטי צד ב')
      return
    }
    if (!marriageDate || !separationDate) {
      setError('אנא מלא תאריך נישואין ומועד הקרע')
      return
    }

    setLoading(true)
    try {
      const caseId = await createCase({
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
      <nav
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 1.5rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)',
        }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <span
            style={{
              fontWeight: '800',
              fontSize: '1.125rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
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
            {/* Party A */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  marginBottom: '1rem',
                  padding: '0.625rem 1rem',
                  background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
                  borderRadius: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                  }}
                >
                  א
                </div>
                <span style={{ fontWeight: '700', color: '#4338ca' }}>צד א</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">שם מלא</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ישראל ישראלי"
                    value={partyA.fullName}
                    onChange={e => setPartyA({ ...partyA, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">תעודת זהות</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="000000000"
                    value={partyA.idNumber}
                    onChange={e => setPartyA({ ...partyA, idNumber: e.target.value })}
                    maxLength={9}
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    required
                  />
                </div>
                <div>
                  <label className="label">תאריך לידה</label>
                  <input
                    type="date"
                    className="input"
                    value={partyA.dateOfBirth}
                    onChange={e => setPartyA({ ...partyA, dateOfBirth: e.target.value })}
                    dir="ltr"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Party B */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  marginBottom: '1rem',
                  padding: '0.625rem 1rem',
                  background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)',
                  borderRadius: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                  }}
                >
                  ב
                </div>
                <span style={{ fontWeight: '700', color: '#7e22ce' }}>צד ב</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">שם מלא</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="שרה ישראלי"
                    value={partyB.fullName}
                    onChange={e => setPartyB({ ...partyB, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">תעודת זהות</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="000000000"
                    value={partyB.idNumber}
                    onChange={e => setPartyB({ ...partyB, idNumber: e.target.value })}
                    maxLength={9}
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    required
                  />
                </div>
                <div>
                  <label className="label">תאריך לידה</label>
                  <input
                    type="date"
                    className="input"
                    value={partyB.dateOfBirth}
                    onChange={e => setPartyB({ ...partyB, dateOfBirth: e.target.value })}
                    dir="ltr"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Marriage / Separation dates */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#374151', margin: '0 0 1rem 0' }}>
                תאריכים
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">תאריך נישואין</label>
                  <input
                    type="date"
                    className="input"
                    value={marriageDate}
                    onChange={e => setMarriageDate(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="label">מועד הקרע</label>
                  <input
                    type="date"
                    className="input"
                    value={separationDate}
                    onChange={e => setSeparationDate(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '0.75rem 2rem' }}
              >
                {loading ? 'שומר...' : 'הבא — ניהול נכסים ←'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
