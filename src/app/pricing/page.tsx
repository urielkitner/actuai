'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const FEATURES = [
  'ניהול תיקי איזון משאבים',
  'כל קטגוריות הנכסים (נדל"ן, פנסיה, עסקים, פיננסי, רכב, חובות)',
  'חישוב אוטומטי של תשלום מאזן',
  'ייצוא דוחות PDF ו-Excel',
  'ממשק RTL מלא בעברית',
  'אבטחת מידע מתקדמת',
  'גיבוי אוטומטי של נתונים',
]

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const upgradeMessage = searchParams.get('message')

  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isIlaaApproved, setIsIlaaApproved] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      setIsLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('ilaa_status')
        .eq('id', session.user.id)
        .single()
      setIsIlaaApproved(profile?.ilaa_status === 'approved')
      setLoading(false)
    })
  }, [])

  const handlePlanClick = () => {
    alert('בקרוב - אפשרות תשלום תתווסף בקרוב')
  }

  const handleTrialClick = () => {
    if (!isLoggedIn) {
      router.push('/auth')
    } else {
      alert('בקרוב - אפשרות תשלום תתווסף בקרוב')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#6b7280' }}>טוען...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem',
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)',
      }}>
        <Link href={isLoggedIn ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img src="/logo.png" alt="ActuAi logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <span style={{
            fontWeight: '800', fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>ActuAi</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isLoggedIn ? (
            <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
              לוח הבקרה
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => router.push('/auth')} style={{ fontSize: '0.875rem' }}>
              התחברות
            </button>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Upgrade message banner */}
        {upgradeMessage && (
          <div style={{
            background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.75rem',
            padding: '1rem 1.25rem', marginBottom: '2rem', color: '#92400e',
            fontSize: '0.9375rem', fontWeight: '600', textAlign: 'center',
          }}>
            {upgradeMessage}
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2rem', fontWeight: '800', margin: '0 0 0.75rem 0',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            תוכניות ומחירים
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            בחר את התוכנית המתאימה לך ותתחיל לעבוד באופן מקצועי יותר
          </p>
        </div>

        {/* Plans grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          alignItems: 'start',
        }}>
          {/* Free Trial card */}
          <div className="card" style={{ padding: '2rem', position: 'relative' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🆓</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>ניסיון חינם</h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1.5rem 0' }}>
                התנסה במערכת ללא עלות
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1f2937' }}>חינם</span>
              </div>
              <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                תיק אחד ללא תשלום
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                  <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>✓</span>
                  תיק אחד בחינם
                </li>
                {FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                    <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn-secondary"
              onClick={handleTrialClick}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontSize: '0.9rem' }}
            >
              {isLoggedIn ? 'כבר פעיל' : 'התחל בחינם'}
            </button>
          </div>

          {/* Monthly plan */}
          <div className="card" style={{ padding: '2rem', position: 'relative' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>חודשי</h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1.5rem 0' }}>
                גמישות מקסימלית — בטל בכל עת
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1f2937' }}>250</span>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280' }}>₪</span>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>+ מע"מ /חודש</span>
              </div>
              <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                בטל בכל עת
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                  <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>✓</span>
                  תיקים ללא הגבלה
                </li>
                {FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                    <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn-secondary"
              onClick={handlePlanClick}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontSize: '0.9rem' }}
            >
              בחר תוכנית
            </button>
          </div>

          {/* Yearly or ILAA plan */}
          {isIlaaApproved ? (
            /* ILAA plan */
            <div style={{
              padding: '2rem', borderRadius: '0.75rem', position: 'relative',
              border: '2px solid #8b5cf6',
              background: 'white',
              boxShadow: '0 4px 24px rgb(99 102 241 / 0.15)',
            }}>
              {/* ILAA badge */}
              <div style={{
                position: 'absolute', top: '-14px', right: '50%', transform: 'translateX(50%)',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                padding: '0.375rem 1rem', borderRadius: '9999px',
                fontSize: '0.75rem', fontWeight: '700',
                boxShadow: '0 4px 12px rgb(99 102 241 / 0.35)', whiteSpace: 'nowrap',
              }}>
                מחיר מיוחד לחברי האגודה
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🏛️</span>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>מסלול ILAA</h2>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1.5rem 0' }}>
                  מחיר מיוחד לחברי האיגוד
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1f2937' }}>1,500</span>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280' }}>₪</span>
                  <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>+ מע"מ /שנה</span>
                </div>
                <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                  שווה ערך ל-125 ₪/חודש
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: '700', flexShrink: 0 }}>✓</span>
                    תיקים ללא הגבלה
                  </li>
                  {FEATURES.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                      <span style={{ color: '#8b5cf6', fontWeight: '700', flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handlePlanClick}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  border: 'none', cursor: 'pointer', fontWeight: '700',
                  fontSize: '0.9rem', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                בחר תוכנית
              </button>
            </div>
          ) : (
            /* Yearly plan — highlighted */
            <div style={{
              padding: '2rem', borderRadius: '0.75rem', position: 'relative',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgb(99 102 241 / 0.35)',
              transform: 'scale(1.02)',
            }}>
              {/* Savings badge */}
              <div style={{
                position: 'absolute', top: '-14px', right: '50%', transform: 'translateX(50%)',
                background: '#f59e0b', color: 'white', padding: '0.375rem 1rem',
                borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700',
                boxShadow: '0 4px 12px rgb(245 158 11 / 0.4)', whiteSpace: 'nowrap',
              }}>
                חסכון של 600 ₪
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🌟</span>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'white', margin: 0 }}>שנתי</h2>
                </div>
                <p style={{ color: 'rgb(199 210 254)', fontSize: '0.8125rem', margin: '0 0 1.5rem 0' }}>
                  הכי משתלם — חסוך 50 ₪ לחודש
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: '800', color: 'white' }}>2,400</span>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: 'rgb(199 210 254)' }}>₪</span>
                  <span style={{ fontSize: '0.8125rem', color: 'rgb(199 210 254)' }}>+ מע"מ /שנה</span>
                </div>
                <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'rgb(199 210 254)' }}>
                  שווה ערך ל-200 ₪/חודש
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgb(255 255 255 / 0.2)', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: 'white' }}>
                    <span style={{ color: '#a3e635', fontWeight: '700', flexShrink: 0 }}>✓</span>
                    תיקים ללא הגבלה
                  </li>
                  {FEATURES.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: 'white' }}>
                      <span style={{ color: '#a3e635', fontWeight: '700', flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handlePlanClick}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                  background: 'white', color: '#6366f1',
                  border: 'none', cursor: 'pointer', fontWeight: '700',
                  fontSize: '0.9rem', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                בחר תוכנית
              </button>
            </div>
          )}
        </div>

        {/* VAT note */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem', marginTop: '2rem', marginBottom: '0.5rem' }}>
          כל המחירים אינם כוללים מע״מ
        </p>

        {/* Contact button */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            className="btn-secondary"
            onClick={() => alert('בקרוב - אפשרות תשלום תתווסף בקרוב')}
            style={{ fontSize: '0.875rem' }}
          >
            צור קשר לשאלות
          </button>
        </div>
      </main>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#6b7280' }}>טוען...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
