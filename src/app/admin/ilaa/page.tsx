'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface IlaaProfile {
  id: string
  full_name: string
  ilaa_id_number: string | null
  ilaa_status: string
  email: string
  created_at: string
}

type View = 'pending' | 'history'

export default function IlaaAdminPage() {
  const [profiles, setProfiles] = useState<IlaaProfile[]>([])
  const [history, setHistory] = useState<IlaaProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [view, setView] = useState<View>('pending')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const token = session.access_token

    const [pendingRes, historyRes] = await Promise.all([
      fetch('/api/ilaa/list', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
    ])

    if (!pendingRes.ok) { setError('שגיאה בטעינת הנתונים'); setLoading(false); return }
    const { profiles: pending } = await pendingRes.json()
    setProfiles(pending ?? [])

    if (historyRes.ok) {
      const { users } = await historyRes.json()
      setHistory((users ?? []).filter((u: IlaaProfile) =>
        u.ilaa_status === 'approved' || u.ilaa_status === 'rejected'
      ))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAction = async (profile: IlaaProfile, action: 'approved' | 'rejected') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setActionLoading(profile.id + action)
    try {
      const res = await fetch('/api/ilaa/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ profileId: profile.id, action, userEmail: profile.email, userFullName: profile.full_name }),
      })
      if (!res.ok) throw new Error('שגיאה')
      setProfiles(prev => prev.filter(p => p.id !== profile.id))
      setHistory(prev => [{ ...profile, ilaa_status: action }, ...prev])
    } catch {
      setError('שגיאה בעדכון הסטטוס')
    } finally {
      setActionLoading(null)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('he-IL')

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>טוען...</div>

  const displayed = view === 'pending' ? profiles : history

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>אימות ILAA</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>ניהול בקשות חברות ILAA</p>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {([['pending', `ממתינים (${profiles.length})`], ['history', `היסטוריה (${history.length})`]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem',
              fontWeight: view === v ? '600' : '400',
              background: view === v ? '#6366f1' : 'white',
              color: view === v ? 'white' : '#475569',
              border: view === v ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)' }}>
          {view === 'pending' ? 'אין בקשות ממתינות' : 'אין היסטוריה'}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['שם מלא', 'אימייל', 'תעודת זהות', 'תאריך הרשמה', view === 'pending' ? 'פעולות' : 'סטטוס'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.8125rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: '500', color: '#1e293b' }}>{p.full_name}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#64748b', direction: 'ltr', textAlign: 'left' }}>{p.email}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#64748b', direction: 'ltr' }}>{p.ilaa_id_number ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{p.created_at ? fmt(p.created_at) : '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {view === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleAction(p, 'approved')}
                          disabled={!!actionLoading}
                          style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          {actionLoading === p.id + 'approved' ? '...' : 'אשר'}
                        </button>
                        <button
                          onClick={() => handleAction(p, 'rejected')}
                          disabled={!!actionLoading}
                          style={{ background: 'white', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', padding: '5px 14px', fontSize: '0.8125rem', cursor: 'pointer' }}
                        >
                          {actionLoading === p.id + 'rejected' ? '...' : 'דחה'}
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                        background: p.ilaa_status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: p.ilaa_status === 'approved' ? '#16a34a' : '#dc2626',
                      }}>
                        {p.ilaa_status === 'approved' ? 'אושר' : 'נדחה'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
