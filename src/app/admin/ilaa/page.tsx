'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface PendingProfile {
  id: string
  full_name: string
  ilaa_id_number: string | null
  ilaa_status: string
  email: string
}

export default function IlaaAdminPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || session.user.email !== 'aiactuar@gmail.com') {
        router.replace('/auth')
        return
      }

      // Fetch pending profiles with their auth email via the admin client
      // We use the anon client here since we're logged in as the admin user
      // and the profiles table has RLS — so we call a custom API to get data
      const res = await fetch('/api/ilaa/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setError('שגיאה בטעינת הנתונים'); setLoading(false); return }
      const data = await res.json()
      setProfiles(data.profiles ?? [])
      setLoading(false)
    })
  }, [router])

  const handleAction = async (profile: PendingProfile, action: 'approved' | 'rejected') => {
    setActionLoading(profile.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ilaa/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          profileId: profile.id,
          action,
          userEmail: profile.email,
          userFullName: profile.full_name,
        }),
      })
      if (!res.ok) throw new Error('שגיאה בעדכון הסטטוס')
      setProfiles(prev => prev.filter(p => p.id !== profile.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setActionLoading(null)
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1f2937', marginBottom: '0.5rem' }}>
          ניהול אימות ILAA
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
          בקשות ממתינות לאימות חברות ILAA
        </p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
        )}

        {profiles.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            אין בקשות ממתינות
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profiles.map(profile => (
              <div key={profile.id} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                    {profile.full_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{profile.email}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    ת.ז.: {profile.ilaa_id_number ?? '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    className="btn-primary"
                    disabled={actionLoading === profile.id}
                    onClick={() => handleAction(profile, 'approved')}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    {actionLoading === profile.id ? '...' : 'אשר'}
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={actionLoading === profile.id}
                    onClick={() => handleAction(profile, 'rejected')}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', color: '#dc2626', borderColor: '#dc2626' }}
                  >
                    {actionLoading === profile.id ? '...' : 'דחה'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
