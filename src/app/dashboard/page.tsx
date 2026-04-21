'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadCases, updateCaseStatus } from '@/lib/db'
import type { CaseSummaryRow, CaseStatus } from '@/lib/db'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

// ── Google Fonts: Heebo ────────────────────────────────────────────────────────
const heeboStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
  * { font-family: 'Heebo', sans-serif; }
`

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'פתוח',
  closed: 'סגור',
  pending: 'ממתין',
}

const STATUS_COLORS: Record<CaseStatus, { bg: string; color: string }> = {
  open:    { bg: '#dcfce7', color: '#16a34a' },
  closed:  { bg: '#f1f5f9', color: '#64748b' },
  pending: { bg: '#fef9c3', color: '#ca8a04' },
}

type SubscriptionStatus = 'none' | 'active' | 'expired'

const PLAN_LABELS: Record<SubscriptionStatus, string> = {
  none:    'ניסיון חינם',
  active:  'מנוי פעיל',
  expired: 'מנוי פג תוקף',
}

const PLAN_BADGE: Record<SubscriptionStatus, { bg: string; color: string }> = {
  none:    { bg: '#f1f5f9', color: '#64748b' },
  active:  { bg: '#dcfce7', color: '#16a34a' },
  expired: { bg: '#fee2e2', color: '#dc2626' },
}

const WELCOME_DISMISSED_KEY = 'actuai_welcome_dismissed'

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [cases, setCases] = useState<CaseSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none')
  const [welcomeDismissed, setWelcomeDismissed] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWelcomeDismissed(!!localStorage.getItem(WELCOME_DISMISSED_KEY))
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      setUser(session.user)
      try {
        const [casesResult, profileResult] = await Promise.all([
          loadCases(),
          supabase.from('profiles').select('subscription_status').eq('id', session.user.id).single(),
        ])
        setCases(casesResult)
        setSubscriptionStatus((profileResult.data?.subscription_status ?? 'none') as SubscriptionStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת התיקים')
      } finally {
        setLoading(false)
      }
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  const handleStatusChange = async (caseId: string, status: CaseStatus) => {
    try {
      await updateCaseStatus(caseId, status)
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c))
    } catch { /* silent */ }
  }

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setWelcomeDismissed(true)
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    return user?.email?.split('@')[0] ?? 'משתמש'
  }

  const thisMonthCases = cases.filter(c => {
    const d = new Date(c.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('he-IL')

  if (loading) {
    return (
      <>
        <style>{heeboStyle}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 300 }}>טוען...</div>
        </div>
      </>
    )
  }

  const isFree = subscriptionStatus === 'none'
  const planBadge = PLAN_BADGE[subscriptionStatus]
  const usedRatio = isFree ? Math.min(cases.length / 1, 1) : 0

  return (
    <>
      <style>{heeboStyle}</style>
      <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>

        {/* ── Navbar ── */}
        <nav style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 2rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="ActuAi" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            <span style={{
              fontWeight: 700, fontSize: '17px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>ActuAi</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px', fontWeight: 700,
              }}>
                {getDisplayName().charAt(0)}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                {getDisplayName()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px',
                padding: '6px 14px', fontSize: '13px', fontWeight: 500,
                color: '#6b7280', cursor: 'pointer',
              }}
            >
              התנתק
            </button>
          </div>
        </nav>

        {/* ── Main ── */}
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px 0', lineHeight: 1.2 }}>
                שלום, {getDisplayName()}
              </h1>
              <p style={{ fontSize: '14px', fontWeight: 300, color: '#6b7280', margin: 0 }}>
                ניהול תיקי איזון משאבים
              </p>
            </div>
            <button
              onClick={() => router.push('/cases/new')}
              style={{
                background: '#4f46e5', color: 'white',
                border: 'none', borderRadius: '10px',
                padding: '10px 22px', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
              }}
            >
              + תיק חדש
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px',
              padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {/* Welcome banner */}
          {cases.length === 0 && !welcomeDismissed && (
            <div style={{
              background: '#f0f4ff',
              borderRight: '4px solid #4f46e5',
              borderRadius: '10px',
              padding: '14px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#3730a3' }}>
                ברוכים הבאים ל-ActuAi! לחץ על &quot;+ תיק חדש&quot; כדי להתחיל
              </span>
              <button
                onClick={dismissWelcome}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6366f1', fontSize: '16px', lineHeight: 1,
                  padding: '2px 6px', flexShrink: 0, fontWeight: 500,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <StatCard label='סה"כ תיקים'    value={cases.length}                                    accentColor="#4f46e5" />
            <StatCard label="תיקים פתוחים"  value={cases.filter(c => c.status === 'open').length}   accentColor="#16a34a" />
            <StatCard label="תיקים סגורים"  value={cases.filter(c => c.status === 'closed').length} accentColor="#dc2626" />
            <StatCard label="תיקים החודש"   value={thisMonthCases}                                   accentColor="#2563eb" />
          </div>

          {/* Cases table */}
          <div style={{
            background: '#ffffff', borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
            marginBottom: '24px', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                תיקים אחרונים
              </h2>
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 300 }}>{cases.length} תיקים</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['מספר תיק', 'שמות הצדדים', 'תאריך פתיחה', 'נכסים', 'סטטוס', 'פעולות'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'right', fontSize: '13px',
                      fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f0f0f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '48px', fontSize: '14px', fontWeight: 300 }}>
                      אין תיקים עדיין. לחץ על &quot;+ תיק חדש&quot; כדי להתחיל.
                    </td>
                  </tr>
                ) : (
                  cases.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        cursor: 'pointer',
                        borderBottom: i < cases.length - 1 ? '1px solid #f9fafb' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => router.push(`/cases/${c.id}/assets`)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#4f46e5', fontSize: '14px' }}>{c.caseNumber}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#1a1a2e', fontSize: '14px' }}>{c.partyAName}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, marginTop: '2px' }}>{c.partyBName}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px', fontWeight: 300 }}>
                        {formatDate(c.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px', fontWeight: 300 }}>
                        {c.assetCount > 0 ? `${c.assetCount} נכסים` : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: STATUS_COLORS[c.status].bg,
                            color: STATUS_COLORS[c.status].color,
                            borderRadius: '9999px',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            const next: Record<CaseStatus, CaseStatus> = { open: 'pending', pending: 'closed', closed: 'open' }
                            handleStatusChange(c.id, next[c.status])
                          }}
                          title="לחץ לשינוי סטטוס"
                        >
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/cases/${c.id}/assets`) }}
                          style={{
                            background: 'none', border: '1px solid #e5e7eb', borderRadius: '7px',
                            padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                            color: '#374151', cursor: 'pointer',
                          }}
                        >
                          פתח
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Subscription card */}
            <div style={{
              background: '#ffffff', borderRadius: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
              padding: '20px',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' }}>
                מנוי ותוכנית
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{
                  background: planBadge.bg, color: planBadge.color,
                  borderRadius: '9999px', padding: '4px 12px',
                  fontSize: '13px', fontWeight: 600,
                }}>
                  {PLAN_LABELS[subscriptionStatus]}
                </span>
              </div>

              {isFree && (
                <>
                  <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 300, margin: '0 0 8px 0' }}>
                    {cases.length} מתוך 1 תיקים חינמיים בשימוש
                  </p>
                  <div style={{ background: '#f1f5f9', borderRadius: '9999px', height: '6px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '9999px',
                      background: usedRatio >= 1 ? '#dc2626' : '#4f46e5',
                      width: `${usedRatio * 100}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </>
              )}
              {!isFree && (
                <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 300, margin: '0 0 16px 0' }}>
                  {cases.length} תיקים פעילים
                </p>
              )}

              <button
                onClick={() => router.push('/pricing')}
                style={{
                  width: '100%', padding: '9px', borderRadius: '9px',
                  background: 'none', border: '1.5px solid #4f46e5', color: '#4f46e5',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {isFree ? 'שדרג מנוי' : 'נהל מנוי'}
              </button>
            </div>

            {/* Support card */}
            <div style={{
              background: '#ffffff', borderRadius: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
              padding: '20px',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' }}>
                צור קשר ותמיכה
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <a href="tel:0502488805" style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '9px', background: '#f9fafb',
                  textDecoration: 'none', color: '#374151', fontSize: '14px', fontWeight: 500,
                }}>
                  <span style={{ fontSize: '16px' }}>📞</span>
                  050-248-8805
                </a>
                <a href="mailto:aiactuar@gmail.com" style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '9px', background: '#f9fafb',
                  textDecoration: 'none', color: '#374151', fontSize: '14px', fontWeight: 500,
                }}>
                  <span style={{ fontSize: '16px' }}>✉️</span>
                  aiactuar@gmail.com
                </a>
              </div>

              <a
                href="https://wa.me/972502488805"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '9px', borderRadius: '9px',
                  background: '#25d366', color: 'white',
                  fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, accentColor }: { label: string; value: number; accentColor: string }) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
      padding: '20px 20px 20px 16px',
      borderRight: `4px solid ${accentColor}`,
    }}>
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1, marginBottom: '6px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 300 }}>
        {label}
      </div>
    </div>
  )
}
