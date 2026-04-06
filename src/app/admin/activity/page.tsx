'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Event {
  type: 'case' | 'user'
  label: string
  actor: string
  createdAt: string
}

export default function ActivityPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'case' | 'user'>('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const res = await fetch('/api/admin/activity?limit=100', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setError('שגיאה בטעינת הנתונים'); setLoading(false); return }
      const data = await res.json()
      setEvents(data.events ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  const fmt = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('he-IL') + ' ' + dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>טוען...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>יומן פעילות</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>פעילות אחרונה במערכת — תיקים חדשים ומשתמשים חדשים</p>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {([['all', 'הכל'], ['case', 'תיקים'], ['user', 'משתמשים']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '0.375rem 1rem', borderRadius: '6px', fontSize: '0.8125rem',
              background: filter === v ? '#6366f1' : 'white',
              color: filter === v ? 'white' : '#475569',
              border: filter === v ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer', fontWeight: filter === v ? '600' : '400',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>אין פעילות להצגה</div>
        ) : (
          <div>
            {filtered.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: ev.type === 'case' ? '#ede9fe' : '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                }}>
                  {ev.type === 'case' ? '📁' : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{ev.label}</div>
                  {ev.actor && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>{ev.actor}</div>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>{fmt(ev.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
