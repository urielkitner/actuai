'use client'

import { useRouter } from 'next/navigation'

const FEATURES = [
  'ניהול תיקי איזון משאבים ללא הגבלה',
  'כל קטגוריות הנכסים (נדל"ן, פנסיה, עסקים, פיננסי, רכב, חובות)',
  'חישוב אוטומטי של תשלום מאזן',
  'ייצוא דוחות PDF ו-Excel',
  'ממשק RTL מלא בעברית',
  'אבטחת מידע מתקדמת',
  'גיבוי אוטומטי של נתונים',
]

const YEARLY_EXTRA_FEATURES = [
  'עדיפות בתמיכה טכנית',
  'גישה מוקדמת לפיצ׳רים חדשים',
]

export default function PricingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem',
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: '800' }}>A</span>
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.125rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ActuAi
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ fontSize: '0.875rem' }}>
            לוח הבקרה
          </button>
          <button className="btn-secondary" onClick={() => router.push('/auth')} style={{ fontSize: '0.875rem' }}>
            התחברות
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontSize: '2rem', fontWeight: '800', margin: '0 0 0.75rem 0',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
          >
            תוכניות ומחירים
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            בחר את התוכנית המתאימה לך ותתחיל לעבוד באופן מקצועי יותר
          </p>
        </div>

        {/* Plans grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}>
          {/* Monthly plan */}
          <div
            className="card"
            style={{ padding: '2rem', position: 'relative' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>מנוי חודשי</h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
                גמישות מקסימלית — שלם רק כשאתה עובד
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1f2937' }}>250</span>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280' }}>₪</span>
                <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>/חודש</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn-secondary"
              onClick={() => alert('פונקציית המנוי תהיה זמינה בקרוב')}
              style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '0.9375rem' }}
            >
              התחל מנוי חודשי
            </button>
          </div>

          {/* Yearly plan — highlighted */}
          <div
            style={{
              padding: '2rem', borderRadius: '0.75rem', position: 'relative',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgb(99 102 241 / 0.35)',
              transform: 'scale(1.02)',
            }}
          >
            {/* Savings badge */}
            <div
              style={{
                position: 'absolute', top: '-14px', right: '50%', transform: 'translateX(50%)',
                background: '#f59e0b', color: 'white', padding: '0.375rem 1rem',
                borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: '700',
                boxShadow: '0 4px 12px rgb(245 158 11 / 0.4)', whiteSpace: 'nowrap',
              }}
            >
              🎉 חסכון של 600 ₪
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🌟</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', margin: 0 }}>מנוי שנתי</h2>
              </div>
              <p style={{ color: 'rgb(199 210 254)', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
                הכי משתלם — חסוך 50 ₪ לחודש
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white' }}>2,400</span>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgb(199 210 254)' }}>₪</span>
                <span style={{ fontSize: '0.875rem', color: 'rgb(199 210 254)' }}>/שנה</span>
              </div>
              <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'rgb(199 210 254)' }}>
                שווה ערך ל-200 ₪/חודש
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgb(255 255 255 / 0.2)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: 'white' }}>
                    <span style={{ color: '#a3e635', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </li>
                ))}
                {YEARLY_EXTRA_FEATURES.map((f, i) => (
                  <li key={`extra-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: 'white' }}>
                    <span style={{ color: '#fde68a', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>⭐</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => alert('פונקציית המנוי תהיה זמינה בקרוב')}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.5rem',
                background: 'white', color: '#6366f1',
                border: 'none', cursor: 'pointer', fontWeight: '700',
                fontSize: '0.9375rem', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              התחל מנוי שנתי
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem', marginTop: '2rem' }}>
          כל התוכניות כוללות תקופת ניסיון חינמית של 14 יום ללא צורך בכרטיס אשראי
        </p>
      </main>
    </div>
  )
}
