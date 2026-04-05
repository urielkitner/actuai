'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

    async function handleCallback() {
      // ── PKCE flow ──────────────────────────────────────────────────────────
      // After email confirmation Supabase appends ?code=... to the redirect URL.
      // We exchange that one-time code for a full session here.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError(`שגיאה באימות: ${error.message}`)
          return
        }
        router.replace(redirectTo)
        return
      }

      // ── Implicit / hash flow ───────────────────────────────────────────────
      // Supabase may deliver tokens in the URL hash (#access_token=...).
      // detectSessionInUrl:true in our client config handles parsing the hash
      // and persisting the session automatically, so we just need to confirm
      // the session exists and then navigate.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(redirectTo)
      } else {
        setError('לא ניתן לאמת את החשבון. אנא נסה שוב.')
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
        padding: '2rem',
      }}>
        <div className="card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <p style={{ color: '#dc2626', marginBottom: '1.5rem' }}>{error}</p>
          <button
            className="btn-primary"
            onClick={() => router.replace('/auth')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            חזור לדף ההתחברות
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '14px', margin: '0 auto 1rem',
          boxShadow: '0 8px 24px rgb(99 102 241 / 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.25rem' }}>A</span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>מאמת את החשבון...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 50%, #faf5ff 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '14px', margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>טוען...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
