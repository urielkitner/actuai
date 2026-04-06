'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface AdminUser {
  id: string
  full_name: string
  email: string
  user_type: string
  ilaa_status: string
  is_blocked: boolean
  subscription_status: string
  subscription_expires_at: string | null
  created_at: string
}

const ILAA_LABELS: Record<string, string> = { none: 'לא רלוונטי', pending: 'ממתין', approved: 'מאומת', rejected: 'נדחה' }
const SUB_LABELS: Record<string, string> = { none: 'ללא מנוי', active: 'פעיל', expired: 'פג תוקף' }
const PAGE_SIZE = 20

function exportCSV(users: AdminUser[]) {
  const header = 'שם,אימייל,תאריך הרשמה,סוג משתמש,סטטוס ILAA,מנוי,חסום'
  const rows = users.map(u => [
    u.full_name,
    u.email,
    new Date(u.created_at).toLocaleDateString('he-IL'),
    u.user_type === 'independent' ? 'עצמאי' : 'משרד',
    ILAA_LABELS[u.ilaa_status] ?? u.ilaa_status,
    SUB_LABELS[u.subscription_status] ?? u.subscription_status,
    u.is_blocked ? 'כן' : 'לא',
  ].join(','))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
    download: `users-${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click()
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterIlaa, setFilterIlaa] = useState('all')
  const [filterSub, setFilterSub] = useState('all')
  const [page, setPage] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  const fetchUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) { setError('שגיאה בטעינת המשתמשים'); return }
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase()
    if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    if (filterIlaa !== 'all' && u.ilaa_status !== filterIlaa) return false
    if (filterSub !== 'all' && u.subscription_status !== filterSub) return false
    return true
  }), [users, search, filterIlaa, filterSub])

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const doAction = async (action: string, userId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setActionLoading(userId + action)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, userId }),
    })
    if (!res.ok) { setError('שגיאה בביצוע הפעולה') }
    else {
      if (action === 'delete') setUsers(prev => prev.filter(u => u.id !== userId))
      else setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: action === 'block' } : u))
    }
    setActionLoading(null)
    setConfirmDelete(null)
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('he-IL')

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>טוען...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>ניהול משתמשים</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{users.length} משתמשים רשומים</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
        >
          ייצוא CSV
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          placeholder="חיפוש לפי שם או אימייל..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', width: '240px', outline: 'none', background: 'white' }}
          dir="rtl"
        />
        <select value={filterIlaa} onChange={e => { setFilterIlaa(e.target.value); setPage(0) }}
          style={{ padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', cursor: 'pointer' }}>
          <option value="all">כל סטטוסי ILAA</option>
          <option value="pending">ממתין</option>
          <option value="approved">מאומת</option>
          <option value="rejected">נדחה</option>
          <option value="none">לא רלוונטי</option>
        </select>
        <select value={filterSub} onChange={e => { setFilterSub(e.target.value); setPage(0) }}
          style={{ padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', cursor: 'pointer' }}>
          <option value="all">כל סטטוסי מנוי</option>
          <option value="active">פעיל</option>
          <option value="none">ללא מנוי</option>
          <option value="expired">פג תוקף</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['שם', 'אימייל', 'תאריך הרשמה', 'סוג', 'ILAA', 'מנוי', 'פעולות'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>לא נמצאו משתמשים</td></tr>
              ) : pageRows.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: u.is_blocked ? 0.6 : 1 }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#1e293b' }}>
                    {u.full_name}
                    {u.is_blocked && <span style={{ marginRight: '0.5rem', fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px' }}>חסום</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', direction: 'ltr', textAlign: 'left' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(u.created_at)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{u.user_type === 'independent' ? 'עצמאי' : 'משרד'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      background: u.ilaa_status === 'approved' ? '#dcfce7' : u.ilaa_status === 'pending' ? '#fef9c3' : u.ilaa_status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                      color: u.ilaa_status === 'approved' ? '#16a34a' : u.ilaa_status === 'pending' ? '#ca8a04' : u.ilaa_status === 'rejected' ? '#dc2626' : '#64748b',
                    }}>
                      {ILAA_LABELS[u.ilaa_status] ?? u.ilaa_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      background: u.subscription_status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: u.subscription_status === 'active' ? '#16a34a' : '#64748b',
                    }}>
                      {SUB_LABELS[u.subscription_status] ?? u.subscription_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => doAction(u.is_blocked ? 'unblock' : 'block', u.id)}
                        disabled={actionLoading === u.id + (u.is_blocked ? 'unblock' : 'block')}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#475569' }}
                      >
                        {u.is_blocked ? 'בטל חסימה' : 'חסום'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626' }}
                      >
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
              ‹
            </button>
            <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
              עמוד {page + 1} מתוך {pages}
            </span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
              ›
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.75rem' }}>מחיקת משתמש</h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              האם למחוק את <strong>{confirmDelete.full_name}</strong>? פעולה זו בלתי הפיכה וכל הנתונים יימחקו.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start' }}>
              <button
                onClick={() => doAction('delete', confirmDelete.id)}
                disabled={actionLoading === confirmDelete.id + 'delete'}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
              >
                {actionLoading === confirmDelete.id + 'delete' ? 'מוחק...' : 'מחק'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
