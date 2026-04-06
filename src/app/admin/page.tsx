'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  pendingIlaa: number
  totalCases: number
  newUsersThisMonth: number
  activity: { type: 'case' | 'user'; label: string; actor: string; createdAt: string }[]
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)',
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>{label}</div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setError('שגיאה בטעינת הנתונים'); return }
      setStats(await res.json())
    })
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('he-IL') + ' ' +
    new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>לוח בקרה</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>סקירה כללית של המערכת</p>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

      {!stats ? (
        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>טוען...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="סה״כ משתמשים"      value={stats.totalUsers}          color="#6366f1" icon="👥" />
            <StatCard label="מנויים פעילים"      value={stats.activeSubscriptions} color="#10b981" icon="💳" />
            <StatCard label="ממתינים לאימות ILAA" value={stats.pendingIlaa}         color="#f59e0b" icon="⏳" />
            <StatCard label="סה״כ תיקים"         value={stats.totalCases}          color="#8b5cf6" icon="📁" />
            <StatCard label="משתמשים חדשים החודש" value={stats.newUsersThisMonth}   color="#ec4899" icon="✨" />
          </div>

          {/* Activity feed */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem' }}>פעילות אחרונה</h2>
            {stats.activity.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>אין פעילות</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {stats.activity.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.75rem 0',
                    borderBottom: i < stats.activity.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: item.type === 'case' ? '#ede9fe' : '#dcfce7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem',
                    }}>
                      {item.type === 'case' ? '📁' : '👤'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                      {item.actor && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.actor}</div>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>{fmt(item.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
