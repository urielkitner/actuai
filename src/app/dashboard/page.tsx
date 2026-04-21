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

const PRICING_FEATURES = [
  'ניהול תיקי איזון משאבים',
  'כל קטגוריות הנכסים (נדל"ן, פנסיה, עסקים, פיננסי, רכב, חובות)',
  'חישוב אוטומטי של תשלום מאזן',
  'ייצוא דוחות PDF ו-Excel',
  'ממשק RTL מלא בעברית',
  'אבטחת מידע מתקדמת',
  'גיבוי אוטומטי של נתונים',
]

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
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
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
  const [ilaaStatus, setIlaaStatus] = useState<string>('none')
  const [welcomeDismissed, setWelcomeDismissed] = useState(true)
  const [activeSection, setActiveSection] = useState('main')

  // Support form state
  const [supportName, setSupportName] = useState('')
  const [supportMessage, setSupportMessage] = useState('')

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
          supabase.from('profiles').select('subscription_status, ilaa_status').eq('id', session.user.id).single(),
        ])
        setCases(casesResult)
        setSubscriptionStatus((profileResult.data?.subscription_status ?? 'none') as SubscriptionStatus)
        setIlaaStatus(profileResult.data?.ilaa_status ?? 'none')
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
  const isIlaaApproved = ilaaStatus === 'approved'

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'main',         label: 'ראשי',         icon: <IconHome /> },
    { id: 'cases',        label: 'תיקים',        icon: <IconFolder /> },
    { id: 'access',       label: 'מורשי גישה',  icon: <IconUsers /> },
    { id: 'subscription', label: 'מנוי',         icon: <IconCard /> },
    { id: 'support',      label: 'תמיכה',        icon: <IconHeadset /> },
    { id: 'logout',       label: 'יציאה',        icon: <IconLogout /> },
  ]

  // ── Section title for top bar ────────────────────────────────────────────────
  const sectionTitles: Record<string, string> = {
    main: `שלום, ${getDisplayName()}`,
    cases: 'תיקים',
    access: 'מורשי גישה',
    subscription: 'מנוי ותוכנית',
    support: 'תמיכה ויצירת קשר',
  }

  // ── Cases table (reused in main + cases sections) ────────────────────────────
  const CasesTable = () => (
    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
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
                  style={{ display: 'inline-block', background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color, borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); const next: Record<CaseStatus, CaseStatus> = { open: 'pending', pending: 'closed', closed: 'open' }; handleStatusChange(c.id, next[c.status]) }}
                  title="לחץ לשינוי סטטוס"
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </td>
              <td style={{ padding: '11px 16px' }}>
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/cases/${c.id}/assets`) }}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 11px', fontSize: '11px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                >
                  פתח
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ── Section renderers ────────────────────────────────────────────────────────

  const renderMain = () => (
    <>
      {/* Welcome banner */}
      {cases.length === 0 && !welcomeDismissed && (
        <div style={{ background: '#f0f4ff', borderRight: '4px solid #4f46e5', borderRadius: '10px', padding: '13px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#3730a3' }}>
            ברוכים הבאים ל-ActuAi! לחץ על &quot;+ תיק חדש&quot; כדי להתחיל
          </span>
          <button onClick={dismissWelcome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '15px', padding: '2px 6px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <StatCard label='סה"כ תיקים'   value={cases.length}                                    accent="#4f46e5" />
        <StatCard label="תיקים פתוחים" value={cases.filter(c => c.status === 'open').length}   accent="#16a34a" />
        <StatCard label="תיקים סגורים" value={cases.filter(c => c.status === 'closed').length} accent="#dc2626" />
        <StatCard label="תיקים החודש"  value={thisMonthCases}                                   accent="#2563eb" />
      </div>

      {/* Cases table */}
      <CasesTable />
    </>
  )

  const renderAccess = () => (
    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '32px', maxWidth: '560px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px 0' }}>מורשי גישה</h2>
      <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 300, lineHeight: 1.7, margin: '0 0 24px 0' }}>
        אתה רשום כחשבון עצמאי. על מנת להוסיף מורשי גישה נוספים יש ליצור קשר ולעבור לחשבון משרדי.
      </p>
      <a
        href="mailto:aiactuar@gmail.com"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', borderRadius: '9px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
      >
        צור קשר
      </a>
    </div>
  )

  const renderSubscription = () => (
    <>
      <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 300, marginBottom: '28px', marginTop: '0' }}>
        בחר את התוכנית המתאימה לך ותתחיל לעבוד באופן מקצועי יותר
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>

        {/* Free trial */}
        <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' }}>ניסיון חינם</h3>
          <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, margin: '0 0 16px 0' }}>התנסה במערכת ללא עלות</p>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>חינם</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, marginBottom: '20px' }}>תיק אחד ללא תשלום</div>
          <ul style={{ listStyle: 'none', margin: '0 0 20px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['תיק אחד בחינם', ...PRICING_FEATURES].map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#374151', fontWeight: 300 }}>
                <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
              </li>
            ))}
          </ul>
          <button onClick={() => alert('בקרוב - אפשרות תשלום תתווסף בקרוב')} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'none', border: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            כבר פעיל
          </button>
        </div>

        {/* Monthly */}
        <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' }}>חודשי</h3>
          <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, margin: '0 0 16px 0' }}>גמישות מקסימלית — בטל בכל עת</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>250</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>₪ + מע"מ</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, marginBottom: '20px' }}>לחודש · בטל בכל עת</div>
          <ul style={{ listStyle: 'none', margin: '0 0 20px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['תיקים ללא הגבלה', ...PRICING_FEATURES].map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#374151', fontWeight: 300 }}>
                <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
              </li>
            ))}
          </ul>
          <button onClick={() => alert('בקרוב - אפשרות תשלום תתווסף בקרוב')} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'none', border: '1.5px solid #4f46e5', color: '#4f46e5', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            בחר תוכנית
          </button>
        </div>

        {/* Yearly or ILAA */}
        {isIlaaApproved ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '2px solid #4f46e5', boxShadow: '0 4px 20px rgba(79,70,229,0.15)', padding: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-13px', right: '50%', transform: 'translateX(50%)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', borderRadius: '9999px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              מחיר מיוחד לחברי האגודה
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' }}>מסלול ILAA</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, margin: '0 0 16px 0' }}>מחיר מיוחד לחברי האיגוד</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>1,500</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>₪ + מע"מ</span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300, marginBottom: '20px' }}>לשנה · 125 ₪/חודש</div>
            <ul style={{ listStyle: 'none', margin: '0 0 20px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['תיקים ללא הגבלה', ...PRICING_FEATURES].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#374151', fontWeight: 300 }}>
                  <span style={{ color: '#4f46e5', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => alert('בקרוב - אפשרות תשלום תתווסף בקרוב')} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              בחר תוכנית
            </button>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '12px', boxShadow: '0 6px 24px rgba(79,70,229,0.35)', padding: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-13px', right: '50%', transform: 'translateX(50%)', background: '#f59e0b', color: 'white', borderRadius: '9999px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              חסכון של 600 ₪
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: '0 0 6px 0' }}>שנתי</h3>
            <p style={{ fontSize: '12px', color: 'rgba(199,210,254,0.85)', fontWeight: 300, margin: '0 0 16px 0' }}>הכי משתלם — חסוך 50 ₪ לחודש</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>2,400</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(199,210,254,0.85)' }}>₪ + מע"מ</span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(199,210,254,0.85)', fontWeight: 300, marginBottom: '20px' }}>לשנה · 200 ₪/חודש</div>
            <ul style={{ listStyle: 'none', margin: '0 0 20px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['תיקים ללא הגבלה', ...PRICING_FEATURES].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'white', fontWeight: 300 }}>
                  <span style={{ color: '#a3e635', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => alert('בקרוב - אפשרות תשלום תתווסף בקרוב')} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'white', color: '#4f46e5', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              בחר תוכנית
            </button>
          </div>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>כל המחירים אינם כוללים מע״מ</p>
    </>
  )

  const renderSupport = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
      {/* Contact details */}
      <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' }}>פרטי יצירת קשר</h3>
        <p style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 300, margin: '0 0 20px 0' }}>זמינים בימים א׳-ה׳, 9:00-18:00</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <a href="tel:0502488805" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '9px', background: '#f9fafb', textDecoration: 'none', color: '#374151', fontSize: '14px', fontWeight: 500 }}>
            <span style={{ fontSize: '18px' }}>📞</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>050-248-8805</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 300 }}>לחץ להתקשר</div>
            </div>
          </a>
          <a href="mailto:aiactuar@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '9px', background: '#f9fafb', textDecoration: 'none', color: '#374151', fontSize: '14px', fontWeight: 500 }}>
            <span style={{ fontSize: '18px' }}>✉️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>aiactuar@gmail.com</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 300 }}>שלח מייל</div>
            </div>
          </a>
        </div>
        <a href="https://wa.me/972502488805" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '11px', borderRadius: '9px', background: '#25d366', color: 'white', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}>
          💬 שלח הודעה ב-WhatsApp
        </a>
      </div>

      {/* Message form */}
      <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 20px 0' }}>שלח הודעה</h3>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>שם מלא</label>
          <input
            type="text"
            value={supportName}
            onChange={e => setSupportName(e.target.value)}
            placeholder="הזן את שמך"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 300, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>הודעה</label>
          <textarea
            value={supportMessage}
            onChange={e => setSupportMessage(e.target.value)}
            placeholder="כתוב את הודעתך כאן..."
            rows={5}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 300, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#fafafa', fontFamily: 'Heebo, sans-serif' }}
          />
        </div>
        <button
          onClick={() => {
            alert('הודעתך התקבלה, נחזור אליך בהקדם')
            setSupportName('')
            setSupportMessage('')
          }}
          style={{ width: '100%', padding: '10px', borderRadius: '9px', background: '#4f46e5', color: 'white', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
        >
          שלח הודעה
        </button>
      </div>
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'cases':        return <><div style={{ marginBottom: '20px' }}><CasesTable /></div></>
      case 'access':       return renderAccess()
      case 'subscription': return renderSubscription()
      case 'support':      return renderSupport()
      default:             return renderMain()
    }
  }

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display: 'flex', flexDirection: 'row-reverse', minHeight: '100vh', direction: 'rtl' }}>

        {/* ── RIGHT SIDEBAR ── */}
        <aside style={{ width: '220px', minWidth: '220px', background: '#1a2035', display: 'flex', flexDirection: 'column', position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 100, overflowY: 'auto' }}>

          {/* Logo area */}
          <div style={{ paddingTop: '20px', paddingBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.png" alt="ActuAi" style={{ width: '120px', objectFit: 'contain' }} />
          </div>
          <div style={{ height: '1px', background: '#2d3654', marginBottom: '0' }} />

          {/* User section */}
          <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #2d3654' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '16px', margin: '0 auto',
            }}>
              {getDisplayName().charAt(0)}
            </div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', marginTop: '10px', lineHeight: 1.3 }}>
              {getDisplayName()}
            </div>
            {ilaaStatus === 'approved' && (
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                אקטואר מוסמך | ILAA
              </div>
            )}
          </div>

          {/* Main nav items */}
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {navItems.filter(item => item.id !== 'support' && item.id !== 'logout').map(item => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 20px', border: 'none', cursor: 'pointer',
                    background: isActive ? '#4f46e5' : 'transparent',
                    borderRadius: isActive ? '8px' : '0',
                    margin: isActive ? '2px 8px' : '0',
                    width: isActive ? 'calc(100% - 16px)' : '100%',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: '14px', fontWeight: isActive ? 600 : 400,
                    textAlign: 'right', transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#2d3654'; e.currentTarget.style.color = '#ffffff' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
                >
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Bottom pinned items */}
          <div style={{ borderTop: '1px solid #2d3654', padding: '8px 0' }}>
            {navItems.filter(item => item.id === 'support' || item.id === 'logout').map(item => {
              const isActive = item.id !== 'logout' && activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'logout' ? handleLogout() : setActiveSection(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 20px', border: 'none', cursor: 'pointer',
                    background: isActive ? '#4f46e5' : 'transparent',
                    borderRadius: isActive ? '8px' : '0',
                    margin: isActive ? '2px 8px' : '0',
                    width: isActive ? 'calc(100% - 16px)' : '100%',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: '14px', fontWeight: isActive ? 600 : 400,
                    textAlign: 'right', transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#2d3654'; e.currentTarget.style.color = '#ffffff' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
                >
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, marginRight: '220px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top bar */}
          <div style={{ background: '#ffffff', borderBottom: '1px solid #f0f0f0', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>
                {sectionTitles[activeSection] ?? 'לוח בקרה'}
              </span>
              {activeSection === 'main' && (
                <span style={{ fontSize: '13px', fontWeight: 300, color: '#9ca3af', marginRight: '10px' }}>
                  ניהול תיקי איזון משאבים
                </span>
              )}
            </div>
            {(activeSection === 'main' || activeSection === 'cases') && (
              <button
                onClick={() => router.push('/cases/new')}
                style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '9px', padding: '9px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}
              >
                + תיק חדש
              </button>
            )}
          </div>

          {/* Page content */}
          <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '14px' }}>
                {error}
              </div>
            )}
            {renderSection()}
          </div>

          {/* ── FOOTER ── */}
          <footer style={{ borderTop: '1px solid #f0f0f0', background: '#ffffff', padding: '10px 28px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontWeight: 300, flexShrink: 0 }}>
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
    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', padding: '18px 18px 18px 14px', borderRight: `4px solid ${accent}` }}>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1, marginBottom: '5px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300 }}>{label}</div>
    </div>
  )
}
