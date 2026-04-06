'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase redirects here with the session embedded in the URL hash.
    // detectSessionInUrl: true (set in supabase.ts) handles the exchange automatically.
    // We just need to confirm a session is now active.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session — the link may be expired or already used
        setError('הקישור לאיפוס סיסמא אינו תקף או שפג תוקפו. אנא בקש קישור חדש.')
      }
      setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('הסיסמא חייבת להכיל לפחות 6 תווים')
      return
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.replace('/dashboard'), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה באיפוס הסיסמא')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '1rem' }}
          />
          <h1 style={{
            fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            ActuAi
          </h1>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#dcfce7', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem',
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.5rem' }}>
                הסיסמא עודכנה בהצלחה!
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                מועבר ללוח הבקרה...
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.25rem' }}>
                הגדרת סיסמא חדשה
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>
                הזן סיסמא חדשה לחשבונך
              </p>

              {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

              {ready && !error && (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">סיסמא חדשה</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="לפחות 6 תווים"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      style={{ textAlign: 'left' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label">אימות סיסמא</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="הזן שוב את הסיסמא"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      dir="ltr"
                      style={{ textAlign: 'left' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                  >
                    {loading ? 'שומר...' : 'עדכן סיסמא'}
                  </button>
                </form>
              )}

              {error && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={() => router.push('/auth')}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    חזור לדף הכניסה
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
