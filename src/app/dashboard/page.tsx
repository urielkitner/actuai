'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadCases, updateCaseStatus } from '@/lib/db'
import type { CaseSummaryRow, CaseStatus } from '@/lib/db'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'פתוח',
  closed: 'סגור',
  pending: 'ממתין',
}

const STATUS_COLORS: Record<CaseStatus, { bg: string; color: string }> = {
  open:    { bg: '#dcfce7', color: '#16a34a' },
  closed:  { bg: '#f1f5f9', color: '#64748b' },
  pending: { bg: '#fef9c3', color: '#ca8a04' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [cases, setCases] = useState<CaseSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/auth')
        return
      }
      setUser(session.user)
      try {
        const rows = await loadCases()
        setCases(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת התיקים')
      } finally {
        setLoading(false)
      }
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  const handleStatusChange = async (caseId: string, status: CaseStatus) => {
    try {
      await updateCaseStatus(caseId, status)
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c))
    } catch {
      // silently ignore — the status badge is just cosmetic here
    }
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    return user?.email?.split('@')[0] ?? 'משתמש'
  }

  const thisMonthCases = cases.filter(c => {
    const d = new Date(c.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('he-IL')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>טוען...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem',
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="ActuAi logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <span style={{
            fontWeight: '800', fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>ActuAi</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.875rem', fontWeight: '700',
            }}>
              {getDisplayName().charAt(0)}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              {getDisplayName()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
          >
            התנתק
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1f2937', margin: '0 0 0.25rem 0' }}>
              שלום, {getDisplayName()}
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
              ניהול תיקי איזון משאבים
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => router.push('/cases/new')}
            style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
          >
            + תיק חדש
          </button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label='סה"כ תיקים' value={cases.length} color="#6366f1" icon="📁" />
          <StatCard label="תיקים פתוחים"  value={cases.filter(c => c.status === 'open').length}   color="#10b981" icon="✅" />
          <StatCard label="תיקים סגורים"  value={cases.filter(c => c.status === 'closed').length} color="#64748b" icon="🔒" />
          <StatCard label="תיקים החודש"   value={thisMonthCases}                                   color="#f59e0b" icon="📅" />
        </div>

        {/* Cases table */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
              תיקים אחרונים
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{cases.length} תיקים</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>מספר תיק</th>
                  <th>שמות הצדדים</th>
                  <th>תאריך פתיחה</th>
                  <th>נכסים</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem' }}>
                      אין תיקים עדיין. לחץ על &quot;+ תיק חדש&quot; כדי להתחיל.
                    </td>
                  </tr>
                ) : (
                  cases.map(c => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/cases/${c.id}/assets`)}
                    >
                      <td>
                        <span style={{ fontWeight: '600', color: '#6366f1' }}>{c.caseNumber}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{c.partyAName}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{c.partyBName}</div>
                      </td>
                      <td style={{ color: '#6b7280' }}>{formatDate(c.createdAt)}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                        {c.assetCount > 0
                          ? `${c.assetCount} נכסים`
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td>
                        {/* Clickable status badge cycles through statuses */}
                        <span
                          className="badge"
                          style={{
                            background: STATUS_COLORS[c.status].bg,
                            color: STATUS_COLORS[c.status].color,
                            cursor: 'pointer',
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            const next: Record<CaseStatus, CaseStatus> = { open: 'pending', pending: 'closed', closed: 'open' }
                            handleStatusChange(c.id, next[c.status])
                          }}
                          title="לחץ לשינוי סטטוס"
                        >
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={e => { e.stopPropagation(); router.push(`/cases/${c.id}/assets`) }}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                        >
                          פתח
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1f2937', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{label}</div>
      </div>
    </div>
  )
}
