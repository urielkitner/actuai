import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// By default Supabase stores the session in localStorage, which the server-side
// middleware cannot read. This custom storage adapter writes to document.cookie
// instead, so the session cookie travels with every request and the middleware
// can gate protected routes without an extra API round-trip.
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
    if (!match) return null
    return decodeURIComponent(match.slice(key.length + 1))
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    document.cookie =
      `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    // Keep the default storageKey so the cookie is named sb-<ref>-auth-token,
    // which is exactly what the middleware pattern-matches against.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
