'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadCases, updateCaseStatus } from '@/lib/db'
import type { CaseSummaryRow, CaseStatus } from '@/lib/db'
import type { User } from '@supabase/supabase-js'

// ── Heebo font ─────────────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');
  *, *::before, *::after { font-family: 'Heebo', sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
`

// ── Types / constants ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<CaseStatus, string> = { open: 'פתוח', closed: 'סגור', pending: 'ממתין' }
const STATUS_COLORS: Record<CaseStatus, { bg: string; color: string }> = {
  open:    { bg: '#dcfce7', color: '#16a34a' },
  closed:  { bg: '#f1f5f9', color: '#64748b' },
  pending: { bg: '#fef9c3', color: '#ca8a04' },
}
type SubscriptionStatus = 'none' | 'active' | 'expired'
const PLAN_LABELS: Record<SubscriptionStatus, string> = { none: 'ניסיון חינם', active: 'מנוי פעיל', expired: 'מנוי פג תוקף' }
const PLAN_BADGE: Record<SubscriptionStatus, { bg: string; color: string }> = {
  none:    { bg: '#f1f5f9', color: '#64748b' },
  active:  { bg: '#dcfce7', color: '#16a34a' },
  expired: { bg: '#fee2e2', color: '#dc2626' },
}
const WELCOME_KEY = 'actuai_welcome_dismissed'

// ── Sidebar icons (inline SVG) ─────────────────────────────────────────────────
const IconHome = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconFolder = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconCard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IconHeadset = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
)
const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [cases, setCases] = useState<CaseSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none')
  const [welcomeDismissed, setWelcomeDismissed] = useState(true)
  const [activeNav, setActiveNav] = useState<string>('ראשי')
  const [showSupportTooltip, setShowSupportTooltip] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWelcomeDismissed(!!localStorage.getItem(WELCOME_KEY))
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
    localStorage.setItem(WELCOME_KEY, '1')
    setWelcomeDismissed(true)
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    return user?.email?.split('@')[0] ?? 'משתמש'
  }

  const thisMonthCases = cases.filter(c => {
    const d = new Date(c.createdAt), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const formatDate = (s: string) => new Date(s).toLocaleDateString('he-IL')

  if (loading) {
    return (
      <>
        <style>{globalStyle}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
          <span style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 300 }}>טוען...</span>
        </div>
      </>
    )
  }

  const isFree = subscriptionStatus === 'none'
  const planBadge = PLAN_BADGE[subscriptionStatus]
  const usedRatio = isFree ? Math.min(cases.length, 1) : 0

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems = [
    { label: 'ראשי',         icon: <IconHome />,    onClick: () => { setActiveNav('ראשי'); router.push('/dashboard') } },
    { label: 'תיקים',        icon: <IconFolder />,  onClick: () => { setActiveNav('תיקים'); router.push('/dashboard') } },
    { label: 'מורשי גישה',  icon: <IconUsers />,   onClick: () => { setActiveNav('מורשי גישה') } },
    { label: 'מנוי',         icon: <IconCard />,    onClick: () => { setActiveNav('מנוי'); router.push('/pricing') } },
    { label: 'תמיכה',        icon: <IconHeadset />, onClick: () => setShowSupportTooltip(s => !s) },
    { label: 'יציאה',        icon: <IconLogout />,  onClick: handleLogout },
  ]

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display: 'flex', flexDirection: 'row-reverse', minHeight: '100vh', direction: 'rtl' }}>

        {/* ── RIGHT SIDEBAR ── */}
        <aside style={{
          width: '220px',
          minWidth: '220px',
          background: '#1a2035',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          zIndex: 100,
          overflowY: 'auto',
        }}>
          {/* User section */}
          <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '17px',
              marginBottom: '10px',
            }}>
              {getDisplayName().charAt(0)}
            </div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
              {getDisplayName()}
            </div>
            <div style={{ color: '#8892a4', fontWeight: 300, fontSize: '12px', marginTop: '3px' }}>
              אקטואר מוסמך
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px 10px' }}>
            {navItems.map(item => {
              const isActive = activeNav === item.label
              return (
                <div key={item.label} style={{ position: 'relative' }}>
                  <button
                    onClick={item.onClick}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: isActive ? '#4f46e5' : 'transparent',
                      color: isActive ? '#ffffff' : '#b0bac8',
                      fontSize: '14px', fontWeight: isActive ? 600 : 400,
                      marginBottom: '2px', textAlign: 'right',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#2d3654' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
                    {item.label}
                  </button>

                  {/* Support tooltip */}
                  {item.label === 'תמיכה' && showSupportTooltip && (
                    <div style={{
                      position: 'absolute', right: '110%', top: 0,
                      background: '#ffffff', borderRadius: '10px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      padding: '14px 16px', minWidth: '210px', zIndex: 200,
                      direction: 'rtl',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e', marginBottom: '10px' }}>צור קשר</div>
                      <a href="tel:0502488805" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', textDecoration: 'none', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
                        📞 050-248-8805
                      </a>
                      <a href="mailto:aiactuar@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', textDecoration: 'none', fontSize: '13px', marginBottom: '10px', fontWeight: 500 }}>
                        ✉️ aiactuar@gmail.com
                      </a>
                      <a
                        href="https://wa.me/972502488805"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          background: '#25d366', color: 'white', borderRadius: '7px',
                          padding: '7px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Logo at bottom */}
          <div style={{
            padding: '16px', borderTop: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 700, textAlign: 'center',
          }}>
            ActuAi
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          flex: 1,
          marginRight: '220px',
          background: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}>
          {/* Top bar */}
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 28px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>שלום, {getDisplayName()}</span>
              <span style={{ fontSize: '13px', fontWeight: 300, color: '#9ca3af', marginRight: '10px' }}>
                ניהול תיקי איזון משאבים
              </span>
            </div>
            <button
              onClick={() => router.push('/cases/new')}
              style={{
                background: '#4f46e5', color: 'white', border: 'none', borderRadius: '9px',
                padding: '9px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
              }}
            >
              + תיק חדש
            </button>
          </div>

          {/* Scrollable page content */}
          <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Welcome banner */}
            {cases.length === 0 && !welcomeDismissed && (
              <div style={{
                background: '#f0f4ff', borderRight: '4px solid #4f46e5', borderRadius: '10px',
                padding: '13px 20px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#3730a3' }}>
                  ברוכים הבאים ל-ActuAi! לחץ על &quot;+ תיק חדש&quot; כדי להתחיל
                </span>
                <button onClick={dismissWelcome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '15px', padding: '2px 6px', flexShrink: 0 }}>✕</button>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <StatCard label='סה"כ תיקים'   value={cases.length}                                    accent="#4f46e5" />
              <StatCard label="תיקים פתוחים" value={cases.filter(c => c.status === 'open').length}   accent="#16a34a" />
              <StatCard label="תיקים סגורים" value={cases.filter(c => c.status === 'closed').length} accent="#dc2626" />
              <StatCard label="תיקים החודש"  value={thisMonthCases}                                   accent="#2563eb" />
            </div>

            {/* Cases table */}
            <div style={{
              background: '#ffffff', borderRadius: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
              marginBottom: '20px', overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
              }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>תיקים אחרונים</h2>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300 }}>{cases.length} תיקים</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['מספר תיק', 'שמות הצדדים', 'תאריך פתיחה', 'נכסים', 'סטטוס', 'פעולות'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '44px', fontSize: '14px', fontWeight: 300 }}>
                        אין תיקים עדיין. לחץ על &quot;+ תיק חדש&quot; כדי להתחיל.
                      </td>
                    </tr>
                  ) : cases.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer', borderBottom: i < cases.length - 1 ? '1px solid #f9fafb' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => router.push(`/cases/${c.id}/assets`)}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#4f46e5', fontSize: '13px' }}>{c.caseNumber}</span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#1a1a2e', fontSize: '13px' }}>{c.partyAName}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 300, marginTop: '2px' }}>{c.partyBName}</div>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#6b7280', fontSize: '12px', fontWeight: 300 }}>{formatDate(c.createdAt)}</td>
                      <td style={{ padding: '11px 16px', color: '#6b7280', fontSize: '12px', fontWeight: 300 }}>
                        {c.assetCount > 0 ? `${c.assetCount} נכסים` : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block', background: STATUS_COLORS[c.status].bg,
                            color: STATUS_COLORS[c.status].color, borderRadius: '9999px',
                            padding: '3px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
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
                      <td style={{ padding: '11px 16px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/cases/${c.id}/assets`) }}
                          style={{
                            background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                            padding: '4px 11px', fontSize: '11px', fontWeight: 500, color: '#374151', cursor: 'pointer',
                          }}
                        >
                          פתח
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom row: subscription + support */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              {/* Subscription card */}
              <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 14px 0' }}>מנוי ותוכנית</h3>
                <span style={{
                  display: 'inline-block', background: planBadge.bg, color: planBadge.color,
                  borderRadius: '9999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, marginBottom: '14px',
                }}>
                  {PLAN_LABELS[subscriptionStatus]}
                </span>

                {isFree ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 300, margin: '0 0 8px 0' }}>
                      {cases.length} מתוך 1 תיקים חינמיים בשימוש
                    </p>
                    <div style={{ background: '#f1f5f9', borderRadius: '9999px', height: '5px', marginBottom: '16px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '9999px',
                        background: usedRatio >= 1 ? '#dc2626' : '#4f46e5',
                        width: `${usedRatio * 100}%`, transition: 'width 0.4s',
                      }} />
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 300, margin: '0 0 16px 0' }}>{cases.length} תיקים פעילים</p>
                )}

                <button
                  onClick={() => router.push('/pricing')}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px',
                    background: 'none', border: '1.5px solid #4f46e5', color: '#4f46e5',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {isFree ? 'שדרג מנוי' : 'נהל מנוי'}
                </button>
              </div>

              {/* Support card */}
              <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 14px 0' }}>צור קשר ותמיכה</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <a href="tel:0502488805" style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                    borderRadius: '8px', background: '#f9fafb', textDecoration: 'none',
                    color: '#374151', fontSize: '13px', fontWeight: 500,
                  }}>
                    📞 050-248-8805
                  </a>
                  <a href="mailto:aiactuar@gmail.com" style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                    borderRadius: '8px', background: '#f9fafb', textDecoration: 'none',
                    color: '#374151', fontSize: '13px', fontWeight: 500,
                  }}>
                    ✉️ aiactuar@gmail.com
                  </a>
                </div>
                <a
                  href="https://wa.me/972502488805"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '9px', borderRadius: '8px',
                    background: '#25d366', color: 'white', fontSize: '13px', fontWeight: 700,
                    textDecoration: 'none', boxSizing: 'border-box',
                  }}
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <footer style={{
            borderTop: '1px solid #f0f0f0',
            background: '#ffffff',
            padding: '10px 28px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#9ca3af',
            fontWeight: 300,
            flexShrink: 0,
          }}>
            ActuAi © 2026 · תנאי שימוש · מדיניות פרטיות · הסכם סודיות · הצהרת נגישות
          </footer>
        </div>
      </div>
    </>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
      padding: '18px 18px 18px 14px',
      borderRight: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1, marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300 }}>{label}</div>
    </div>
  )
}
