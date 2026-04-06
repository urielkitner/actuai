'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/admin',              label: 'לוח בקרה',    icon: '◈' },
  { href: '/admin/users',        label: 'משתמשים',     icon: '⊞' },
  { href: '/admin/ilaa',         label: 'אימות ILAA',  icon: '✦' },
  { href: '/admin/subscriptions',label: 'מנויים',      icon: '◉' },
  { href: '/admin/activity',     label: 'פעילות',      icon: '≡' },
  { href: '/admin/settings',     label: 'הגדרות',      icon: '⚙' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.email !== 'aiactuar@gmail.com') {
        router.replace('/auth')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>טוען...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        zIndex: 50,
        overflowY: 'auto',
      }}>
        {/* Logo area */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <img src="/logo.png" alt="ActuAi" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.9375rem', color: 'white', lineHeight: 1 }}>ActuAi</div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>ממשק ניהול</div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, paddingTop: '0.5rem' }}>
          {NAV.map(item => {
            const exact = item.href === '/admin'
            const active = exact ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 1rem',
                  color: active ? 'white' : '#94a3b8',
                  background: active ? '#334155' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: active ? '600' : '400',
                  borderRight: active ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                <span style={{ fontSize: '0.875rem', opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Back to app */}
        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #334155' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: '#64748b', textDecoration: 'none', fontSize: '0.8125rem',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>←</span> חזור לאפליקציה
          </Link>
        </div>
      </aside>

      {/* Page content */}
      <main style={{ flex: 1, marginRight: '220px', background: '#f8fafc', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
