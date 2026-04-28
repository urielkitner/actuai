'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800&display=swap');
  *, *::before, *::after { font-family: 'Heebo', sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
`

type SubscriptionStatus = 'none' | 'active' | 'expired'
type IlaaStatus = 'none' | 'pending' | 'approved' | 'rejected'

const PLAN_LABELS: Record<SubscriptionStatus, string> = { none: 'ניסיון חינם', active: 'מנוי פעיל', expired: 'מנוי פג תוקף' }
const PLAN_BADGE: Record<SubscriptionStatus, { bg: string; color: string }> = {
  none:    { bg: '#f1f5f9', color: '#64748b' },
  active:  { bg: '#dcfce7', color: '#16a34a' },
  expired: { bg: '#fee2e2', color: '#dc2626' },
}
const ILAA_LABELS: Record<IlaaStatus, string> = { none: 'לא חבר', pending: 'בבדיקה', approved: 'מאושר', rejected: 'נדחה' }
const ILAA_BADGE: Record<IlaaStatus, { bg: string; color: string }> = {
  none:     { bg: '#f1f5f9', color: '#64748b' },
  pending:  { bg: '#fef9c3', color: '#ca8a04' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', background: bg, color, borderRadius: '99px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 }}>
      {label}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0', padding: '28px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 24px 0' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState('')
  const [isIlaaMember, setIsIlaaMember] = useState(false)
  const [ilaaStatus, setIlaaStatus] = useState<IlaaStatus>('none')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none')
  const [createdAt, setCreatedAt] = useState('')
  const [caseCount, setCaseCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      setUserId(session.user.id)
      setEmail(session.user.email ?? '')

      const [profileRes, countRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, user_type, is_ilaa_member, ilaa_status, subscription_status, created_at')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('cases')
          .select('id', { count: 'exact', head: true })
          .eq('actuary_id', session.user.id),
      ])

      if (profileRes.data) {
        const p = profileRes.data
        setFullName(p.full_name ?? '')
        setUserType(p.user_type ?? 'independent')
        setIsIlaaMember(p.is_ilaa_member ?? false)
        setIlaaStatus((p.ilaa_status ?? 'none') as IlaaStatus)
        setSubscriptionStatus((p.subscription_status ?? 'none') as SubscriptionStatus)
        setCreatedAt(p.created_at ?? '')
      }
      setCaseCount(countRes.count ?? 0)
      setLoading(false)
    })
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', userId)
    setSaving(false)
    setSaveMsg(error ? `שגיאה: ${error.message}` : '✓ הפרטים נשמרו בהצלחה')
    if (!error) setTimeout(() => setSaveMsg(''), 3000)
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    setResetMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetLoading(false)
    setResetMsg(error ? `שגיאה: ${error.message}` : '✓ נשלח מייל לאיפוס סיסמה')
  }

  const formatDate = (s: string) => s ? new Date(s).toLocaleDateString('he-IL') : '—'

  if (loading) {
    return (
      <>
        <style>{globalStyle}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>טוען...</span>
        </div>
      </>
    )
  }

  const planBadge = PLAN_BADGE[subscriptionStatus]
  const ilaaBadge = ILAA_BADGE[ilaaStatus]

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: '100vh', background: '#f8f9fa', direction: 'rtl' }}>

        {/* Navbar */}
        <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <span style={{ fontWeight: '800', fontSize: '1.125rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              ActuAi<span style={{ color: '#4f46e5', WebkitTextFillColor: '#4f46e5' }}>.</span>
            </span>
          </Link>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
          >
            ← חזור ללוח הבקרה
          </button>
        </nav>

        {/* Page header */}
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 0' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px 0' }}>הפרופיל שלי</h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 300, margin: '0 0 28px 0' }}>ניהול פרטים אישיים והגדרות חשבון</p>
        </div>

        <main style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Personal Details ── */}
          <Card title="פרטים אישיים">
            <Field label="שם מלא">
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="הזן שם מלא"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1.5px solid #e5e7eb', fontSize: '14px', fontWeight: 400, outline: 'none', background: '#fafafa', transition: 'border 0.15s' }}
                onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>סוג חשבון</div>
                <Pill
                  label={userType === 'office' ? 'משרד' : 'עצמאי'}
                  bg="#ede9fe"
                  color="#6d28d9"
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>חבר ILAA</div>
                <Pill
                  label={isIlaaMember ? 'כן' : 'לא'}
                  bg={isIlaaMember ? '#dcfce7' : '#f1f5f9'}
                  color={isIlaaMember ? '#16a34a' : '#64748b'}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>סטטוס ILAA</div>
                <Pill label={ILAA_LABELS[ilaaStatus]} bg={ilaaBadge.bg} color={ilaaBadge.color} />
              </div>
            </div>

            {saveMsg && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '9px', background: saveMsg.startsWith('✓') ? '#f0fdf4' : '#fee2e2', color: saveMsg.startsWith('✓') ? '#16a34a' : '#dc2626', fontSize: '13px', fontWeight: 500 }}>
                {saveMsg}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '9px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </Card>

          {/* ── Row: Login Details + Account Info ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Login Details */}
            <Card title="פרטי התחברות">
              <Field label="כתובת אימייל">
                <div style={{ padding: '10px 14px', borderRadius: '9px', border: '1.5px solid #f0f0f0', fontSize: '14px', color: '#6b7280', background: '#f9fafb', direction: 'ltr', textAlign: 'left' }}>
                  {email}
                </div>
              </Field>
              <div style={{ marginTop: '4px' }}>
                <p style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 300, margin: '0 0 14px 0', lineHeight: 1.6 }}>
                  לשינוי סיסמה נשלח קישור לאיפוס לכתובת האימייל הרשומה
                </p>
                {resetMsg && (
                  <div style={{ marginBottom: '14px', padding: '9px 12px', borderRadius: '8px', background: resetMsg.startsWith('✓') ? '#f0fdf4' : '#fee2e2', color: resetMsg.startsWith('✓') ? '#16a34a' : '#dc2626', fontSize: '13px', fontWeight: 500 }}>
                    {resetMsg}
                  </div>
                )}
                <button
                  onClick={handlePasswordReset}
                  disabled={resetLoading || !!resetMsg}
                  style={{ background: 'white', color: '#4f46e5', border: '1.5px solid #4f46e5', borderRadius: '9px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, cursor: (resetLoading || !!resetMsg) ? 'not-allowed' : 'pointer', opacity: (resetLoading || !!resetMsg) ? 0.6 : 1 }}
                >
                  {resetLoading ? 'שולח...' : 'שנה סיסמה'}
                </button>
              </div>
            </Card>

            {/* Account Info */}
            <Card title="מידע על החשבון">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 400 }}>תאריך הצטרפות</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>{formatDate(createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 400 }}>סטטוס מנוי</span>
                  <Pill label={PLAN_LABELS[subscriptionStatus]} bg={planBadge.bg} color={planBadge.color} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 400 }}>מספר תיקים שנוצרו</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#4f46e5' }}>{caseCount}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Danger Zone ── */}
          <div style={{ background: '#ffffff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1.5px solid #fca5a5', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', margin: '0 0 8px 0' }}>אזור מסוכן</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 300, margin: '0 0 20px 0', lineHeight: 1.7 }}>
              מחיקת החשבון היא פעולה בלתי הפיכה. כל הנתונים, התיקים והנכסים יימחקו לצמיתות.
            </p>
            <button
              onClick={() => alert('לפנייה למחיקת חשבון צור קשר עם התמיכה: aiactuar@gmail.com')}
              style={{ background: 'white', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: '9px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              מחק חשבון
            </button>
          </div>

        </main>
      </div>
    </>
  )
}
