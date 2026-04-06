'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'login' | 'register' | 'forgot'
type UserType = 'independent' | 'office'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ilaaRegistered, setIlaaRegistered] = useState(false)

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('')

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [fullName, setFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [userType, setUserType] = useState<UserType>('independent')
  const [ilaaMemember, setIlaaMemember] = useState(false)
  const [idNumber, setIdNumber] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error

      // Check ILAA status — block pending users
      if (data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ilaa_status, is_blocked')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_blocked) {
          await supabase.auth.signOut()
          throw new Error('החשבון שלך חסום. אנא פנה לתמיכה.')
        }
        if (profile?.ilaa_status === 'pending') {
          await supabase.auth.signOut()
          throw new Error('בקשת האימות שלך עדיין בבדיקה')
        }
      }

      router.replace(redirectTo)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess('נשלח מייל לאיפוס סיסמא. אנא בדוק את תיבת הדואר שלך.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת המייל')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            user_type: userType,
            ilaa_member: ilaaMemember,
            id_number: ilaaMemember ? idNumber : undefined,
            ilaa_status: ilaaMemember ? 'pending' : 'none',
          },
        },
      })
      if (error) throw error

      if (ilaaMemember) {
        // Send notification email to admin
        await fetch('/api/ilaa/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email: regEmail, idNumber }),
        })
        setIlaaRegistered(true)
      } else {
        setSuccess('נשלח אימייל אימות! אנא בדוק את תיבת הדואר שלך.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהרשמה')
    } finally {
      setLoading(false)
    }
  }

  // ILAA pending waiting screen
  if (ilaaRegistered) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1.5rem' }}
          />
          <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef9c3, #fde68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.75rem',
            }}>
              ⏳
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1f2937', margin: '0 0 1rem 0' }}>
              ההרשמה נקלטה בהצלחה!
            </h2>
            <p style={{ color: '#374151', lineHeight: '1.7', margin: 0 }}>
              בקשת האימות שלך ל-ILAA נמצאת בבדיקה.
              <br />
              תקבל מייל לאחר האישור.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              marginBottom: '1rem',
            }}
          />
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 0.5rem 0',
            }}
          >
            ActuAi
          </h1>
          <p style={{ fontWeight: '600', color: '#374151', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
            המערכת החכמה לאיזון משאבים
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0, lineHeight: '1.6' }}>
            פלטפורמה מקצועית לאקטוארים לניהול תיקי איזון משאבים<br />
            בצורה מדויקת, מהירה ומאורגנת
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {/* Tabs */}
          {tab !== 'forgot' && (
            <div className="tab-list" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(''); setSuccess('') }}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                התחברות
              </button>
              <button
                className={`tab ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(''); setSuccess('') }}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                הרשמה
              </button>
            </div>
          )}
          {tab === 'forgot' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.25rem' }}>איפוס סיסמא</h2>
              <button
                onClick={() => { setTab('login'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
              >
                ← חזור להתחברות
              </button>
            </div>
          )}

          {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {tab === 'forgot' && (
            <form onSubmit={handleForgot}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">אימייל</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
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
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>
            </form>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">אימייל</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="label">סיסמה</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setError(''); setSuccess(''); setForgotEmail(loginEmail) }}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
                >
                  שכחתי סיסמא?
                </button>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                {loading ? 'מתחבר...' : 'התחבר'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">שם מלא</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">אימייל</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">סיסמה</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">סוג משתמש</label>
                <select
                  className="input"
                  value={userType}
                  onChange={e => setUserType(e.target.value as UserType)}
                >
                  <option value="independent">עצמאי</option>
                  <option value="office">משרד</option>
                </select>
              </div>
              <div style={{ marginBottom: ilaaMemember ? '1rem' : '1.5rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ilaaMemember}
                    onChange={e => setIlaaMemember(e.target.checked)}
                  />
                  <span>חבר/ה ILAA (אגודת האקטוארים בישראל)</span>
                </label>
              </div>
              {ilaaMemember && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label">תעודת זהות</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="000000000"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    maxLength={9}
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                  />
                </div>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                {loading ? 'נרשם...' : 'הרשמה'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#9ca3af', fontSize: '0.75rem' }}>
          © 2025 ActuAi. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
