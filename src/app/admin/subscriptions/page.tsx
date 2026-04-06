'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface SubUser {
  id: string
  full_name: string
  email: string
  subscription_status: string
  subscription_expires_at: string | null
  created_at: string
}

const SUB_LABELS: Record<string, string> = { none: 'ללא מנוי', active: 'פעיל', expired: 'פג תוקף' }

const PRICES = { monthly: 250, yearly: 2400 }

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expiryInputs, setExpiryInputs] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/subscriptions', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) { setError('שגיאה בטעינת הנתונים'); return }
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? users.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users
  }, [users, search])

  const doAction = async (action: 'activate' | 'deactivate', userId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setActionLoading(userId + action)
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, userId, expiresAt: action === 'activate' ? (expiryInputs[userId] || null) : null }),
    })
    if (!res.ok) setError('שגיאה בעדכון המנוי')
    else {
      setUsers(prev => prev.map(u => u.id !== userId ? u : {
        ...u,
        subscription_status: action === 'activate' ? 'active' : 'none',
        subscription_expires_at: action === 'activate' ? (expiryInputs[userId] || null) : null,
      }))
    }
    setActionLoading(null)
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('he-IL') : '—'

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>טוען...</div>

  const activeCount = users.filter(u => u.subscription_status === 'active').length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>ניהול מנויים</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{activeCount} מנויים פעילים מתוך {users.length} משתמשים</p>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', maxWidth: '480px' }}>
        {[['מנוי חודשי', `${PRICES.monthly}₪`], ['מנוי שנתי', `${PRICES.yearly}₪`]].map(([label, price]) => (
          <div key={label} style={{ background: 'white', borderRadius: '10px', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6366f1' }}>{price}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="חיפוש לפי שם או אימייל..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', width: '260px', outline: 'none', background: 'white', marginBottom: '1rem', display: 'block' }}
        dir="rtl"
      />

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['שם', 'אימייל', 'סטטוס', 'תפוגה', 'תאריך תפוגה חדש', 'פעולות'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>לא נמצאו משתמשים</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#1e293b' }}>{u.full_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', direction: 'ltr', textAlign: 'left' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      background: u.subscription_status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: u.subscription_status === 'active' ? '#16a34a' : '#64748b',
                    }}>
                      {SUB_LABELS[u.subscription_status] ?? u.subscription_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(u.subscription_expires_at)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <input
                      type="date"
                      value={expiryInputs[u.id] ?? ''}
                      onChange={e => setExpiryInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                      style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', outline: 'none' }}
                      dir="ltr"
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => doAction('activate', u.id)}
                        disabled={!!actionLoading}
                        style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        {actionLoading === u.id + 'activate' ? '...' : 'הפעל'}
                      </button>
                      {u.subscription_status === 'active' && (
                        <button
                          onClick={() => doAction('deactivate', u.id)}
                          disabled={!!actionLoading}
                          style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          {actionLoading === u.id + 'deactivate' ? '...' : 'בטל'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
