'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', direction: 'rtl', fontFamily: "'Heebo', sans-serif", overflowX: 'hidden' }}>

      {/* ── Global styles + animations ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spinCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes opacityPulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.65; }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ring-a {
          transform-box: fill-box;
          transform-origin: center;
          animation: spinCW 32s linear infinite;
        }
        .ring-b {
          transform-box: fill-box;
          transform-origin: center;
          animation: spinCCW 22s linear infinite;
        }
        .ring-c {
          animation: opacityPulse 9s ease-in-out infinite;
        }
        .ring-d {
          transform-box: fill-box;
          transform-origin: center;
          animation: spinCW 48s linear infinite;
        }

        .hero-float { animation: floatUp 7s ease-in-out infinite; }
        .fade-in    { animation: fadeInUp 0.9s ease both; }
        .fade-in-2  { animation: fadeInUp 0.9s ease 0.15s both; }
        .fade-in-3  { animation: fadeInUp 0.9s ease 0.3s both; }
        .fade-in-4  { animation: fadeInUp 0.9s ease 0.45s both; }

        .feature-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(79,70,229,0.13) !important;
        }

        .btn-solid {
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .btn-solid:hover {
          background: #4338ca !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(79,70,229,0.4) !important;
        }

        .btn-outline-light {
          transition: background 0.18s, transform 0.18s;
        }
        .btn-outline-light:hover {
          background: rgba(255,255,255,0.08) !important;
          transform: translateY(-2px);
        }

        .btn-outline-dark {
          transition: background 0.18s, transform 0.18s;
        }
        .btn-outline-dark:hover {
          background: #f5f3ff !important;
          transform: translateY(-2px);
        }

        .footer-link:hover { color: #9ca3af !important; }
      `}</style>

      {/* ════════════════════════════════════════ NAVBAR ════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#ffffff',
        borderBottom: scrolled ? '1px solid #e5e7eb' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 10px rgba(0,0,0,0.06)' : 'none',
        padding: '0 5vw', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.2s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#0f0f1a', letterSpacing: '-0.5px', lineHeight: 1 }}>ActuAi</span>
          <span style={{ fontSize: '26px', fontWeight: '900', color: '#4f46e5', lineHeight: 1 }}>.</span>
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-outline-dark" style={{
              padding: '8px 22px', borderRadius: '8px',
              border: '1.5px solid #4f46e5', background: 'white', color: '#4f46e5',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
            }}>
              התחבר
            </button>
          </Link>
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-solid" style={{
              padding: '8px 22px', borderRadius: '8px',
              border: 'none', background: '#4f46e5', color: 'white',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
              boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
            }}>
              התחל בחינם
            </button>
          </Link>
        </div>
      </nav>

      {/* ════════════════════════════════════════ HERO ════════════════════════════════════════ */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '5rem 5vw',
      }}>

        {/* Animated SVG rings background */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
          <svg width="860" height="860" viewBox="0 0 860 860" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* Outermost dashed ring — slow clockwise */}
            <circle className="ring-a" cx="430" cy="430" r="380"
              stroke="#e0e7ff" strokeWidth="1.5" strokeDasharray="24 10" />
            {/* Second ring — counter-clockwise, solid */}
            <circle className="ring-b" cx="430" cy="430" r="300"
              stroke="#ede9fe" strokeWidth="2" />
            {/* Third ring — opacity pulse */}
            <circle className="ring-c" cx="430" cy="430" r="220"
              stroke="#c7d2fe" strokeWidth="1" strokeDasharray="10 14" opacity="0.5" />
            {/* Inner ring — slow clockwise */}
            <circle className="ring-d" cx="430" cy="430" r="140"
              stroke="#ddd6fe" strokeWidth="1.5" />
            {/* Static accent blobs */}
            <circle cx="220" cy="270" r="70"  fill="#f5f3ff" opacity="0.55" />
            <circle cx="620" cy="580" r="90"  fill="#eff6ff" opacity="0.45" />
            <circle cx="640" cy="210" r="45"  fill="#faf5ff" opacity="0.6"  />
            <circle cx="180" cy="590" r="55"  fill="#f0fdf4" opacity="0.4"  />
          </svg>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '700px' }}>

          {/* Badge */}
          <div className="fade-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#f5f3ff', border: '1px solid #e0e7ff',
            borderRadius: '99px', padding: '5px 16px',
            marginBottom: '2rem', fontSize: '13px', color: '#6d28d9', fontWeight: '600',
          }}>
            <span style={{ color: '#4f46e5' }}>✦</span>
            פלטפורמה לאקטוארים מוסמכים
          </div>

          {/* Main headline */}
          <h1 className="fade-in-2" style={{
            fontSize: 'clamp(38px, 6.5vw, 64px)',
            fontWeight: '900', color: '#0f0f1a',
            lineHeight: '1.1', letterSpacing: '-1.5px',
            marginBottom: '1.5rem',
          }}>
            איזון משאבים<br />
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #2563eb 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              בדיוק אקטוארי
            </span>
          </h1>

          {/* Subtitle */}
          <p className="fade-in-3" style={{
            fontSize: '19px', fontWeight: '300', color: '#6b7280',
            maxWidth: '500px', margin: '0 auto 2.75rem',
            lineHeight: '1.75',
          }}>
            הפלטפורמה המקצועית לאקטוארים לניהול תיקי גירושין — מהיר, מדויק, מאובטח
          </p>

          {/* CTA buttons */}
          <div className="fade-in-4" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-solid" style={{
                padding: '15px 36px', borderRadius: '10px',
                border: 'none', background: '#4f46e5', color: 'white',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
                boxShadow: '0 4px 18px rgba(79,70,229,0.38)',
              }}>
                התחל בחינם ←
              </button>
            </Link>
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-outline-dark" style={{
                padding: '15px 36px', borderRadius: '10px',
                border: '1.5px solid #d1d5db', background: 'white', color: '#374151',
                fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
              }}>
                צפה בהדגמה
              </button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="fade-in-4" style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '13px', color: '#9ca3af', fontWeight: '400' }}>
            <span>✓ ללא כרטיס אשראי</span>
            <span>✓ תיק ניסיון חינמי</span>
            <span>✓ מאובטח ומוצפן</span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ STATS ════════════════════════════════════════ */}
      <section style={{
        background: '#fafafa',
        borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0',
        padding: '3.5rem 5vw',
      }}>
        <div style={{
          maxWidth: '680px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {[
            { value: '500+',  label: 'תיקים טופלו' },
            { value: '99.9%', label: 'זמינות מערכת' },
            { value: 'ILAA',  label: 'מוכר על ידי האגודה' },
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {i > 0 && (
                <div style={{ width: '1px', height: '56px', background: '#e5e7eb', flexShrink: 0 }} />
              )}
              <div style={{ textAlign: 'center', flex: 1, padding: '0 1.5rem' }}>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#0f0f1a', letterSpacing: '-1px', marginBottom: '4px', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════ FEATURES ════════════════════════════════════════ */}
      <section style={{ padding: '7rem 5vw', background: '#ffffff' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: '800', color: '#0f0f1a',
              letterSpacing: '-0.5px', marginBottom: '1rem',
            }}>
              כל מה שאקטואר צריך, במקום אחד
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', fontWeight: '300', lineHeight: '1.7' }}>
              כלים מקצועיים שנבנו במיוחד לתחום איזון המשאבים
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '24px' }}>
            {[
              {
                icon: '⚖️',
                title: 'חישוב איזון אוטומטי',
                desc: 'חשב תשלום מאזן בין הצדדים בלחיצת כפתור — נדל"ן, פנסיה, עסקים וכלי רכב.',
                accent: '#f5f3ff',
              },
              {
                icon: '📊',
                title: 'ייבוא מהמסלקה',
                desc: 'העלה קובץ Excel מהמסלקה הפנסיונית הלאומית וייבא נכסים אוטומטית לתיק.',
                accent: '#eff6ff',
              },
              {
                icon: '📄',
                title: 'דוחות PDF מקצועיים',
                desc: 'הפק דוחות חתומים ומעוצבים בשניות, מוכנים להגשה לבית משפט.',
                accent: '#f0fdf4',
              },
            ].map((card, i) => (
              <div key={i} className="feature-card" style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: '16px',
                padding: '2.25rem 2rem',
                boxShadow: '0 2px 14px rgba(0,0,0,0.04)',
              }}>
                {/* Icon container */}
                <div style={{
                  width: '52px', height: '52px',
                  background: card.accent,
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', marginBottom: '1.5rem',
                }}>
                  {card.icon}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f0f1a', marginBottom: '0.75rem' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.75', fontWeight: '300' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ DARK CTA ════════════════════════════════════════ */}
      <section style={{ background: '#0f0f1a', padding: '8rem 5vw', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(79,70,229,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Accent line */}
          <div style={{
            width: '44px', height: '3px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: '2px', margin: '0 auto 2.25rem',
          }} />

          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: '900', color: '#ffffff',
            letterSpacing: '-0.75px', marginBottom: '1rem',
          }}>
            מוכן להתחיל?
          </h2>
          <p style={{
            fontSize: '17px', color: '#9ca3af', fontWeight: '300',
            marginBottom: '2.75rem', lineHeight: '1.75',
          }}>
            הצטרף לאקטוארים שכבר עובדים חכם יותר
          </p>
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-solid" style={{
              padding: '15px 44px', borderRadius: '10px',
              border: 'none', background: '#4f46e5', color: 'white',
              fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
              boxShadow: '0 4px 22px rgba(79,70,229,0.45)',
            }}>
              פתח חשבון חינמי
            </button>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════ FOOTER ════════════════════════════════════════ */}
      <footer style={{
        background: '#0f0f1a',
        borderTop: '1px solid #1a1a2e',
        padding: '2rem 5vw',
      }}>
        <div style={{
          maxWidth: '1040px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '400', lineHeight: '1.8' }}>
            ActuAi © 2026
            {['תנאי שימוש', 'מדיניות פרטיות', 'הצהרת נגישות'].map(t => (
              <span key={t}>
                <span style={{ margin: '0 8px', color: '#374151' }}>·</span>
                <a href="#" className="footer-link" style={{ color: '#4b5563', textDecoration: 'none', transition: 'color 0.15s' }}>{t}</a>
              </span>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '400' }}>
            פותח בישראל 🇮🇱
          </div>
        </div>
      </footer>

    </div>
  )
}
