'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SETTING_SECTIONS = [
  {
    key: 'report_intro',
    title: 'פתיחת דוח',
    description: 'הטקסט שמופיע בתחילת כל דוח PDF',
  },
  {
    key: 'report_disclaimer',
    title: 'הערת אחריות',
    description: 'הטקסט שמופיע בסוף כל דוח PDF',
  },
  {
    key: 'announcement',
    title: 'הודעת מערכת',
    description: 'הודעה שתוצג לכל המשתמשים בעת כניסה למערכת. השאר ריק אם אין הודעה.',
  },
  {
    key: 'terms_of_service',
    title: 'תנאי שימוש',
    description: 'תוכן עמוד תנאי השימוש',
  },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) { setError('שגיאה בטעינת ההגדרות'); return }
    const data = await res.json()
    setValues(data.settings ?? {})
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (key: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSaving(key)
    setError('')
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ key, value: values[key] ?? '' }),
    })
    if (!res.ok) setError('שגיאה בשמירה')
    else { setSaved(key); setTimeout(() => setSaved(null), 2000) }
    setSaving(null)
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>טוען...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>הגדרות מערכת</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>עריכת טקסטים וקונפיגורציה כללית</p>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {SETTING_SECTIONS.map(sec => (
          <div key={sec.key} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.25rem' }}>{sec.title}</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.875rem' }}>{sec.description}</p>
            <textarea
              value={values[sec.key] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [sec.key]: e.target.value }))}
              rows={sec.key === 'terms_of_service' ? 8 : 3}
              style={{
                width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                fontSize: '0.875rem', resize: 'vertical', outline: 'none', direction: 'rtl',
                fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#6366f1' }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                onClick={() => save(sec.key)}
                disabled={saving === sec.key}
                style={{
                  background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                }}
              >
                {saving === sec.key ? 'שומר...' : 'שמור'}
              </button>
              {saved === sec.key && (
                <span style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: '500' }}>נשמר בהצלחה ✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
