import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard the two protected prefixes; everything else is public and
  // handled by the pages themselves or not gated at all.
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/cases')

  if (!isProtected) {
    return NextResponse.next()
  }

  // Supabase v2 writes the session under a cookie named sb-<ref>-auth-token.
  // A cookie presence check is enough here — the pages do a full
  // supabase.auth.getSession() call which validates and refreshes the token.
  const hasSession = request.cookies.getAll().some(
    c =>
      c.name.startsWith('sb-') &&
      c.name.endsWith('-auth-token') &&
      c.value.length > 0,
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Only invoke middleware for the two protected prefixes.
  // All other routes (/auth, /pricing, /, /auth/callback, _next/*, etc.)
  // are never touched by this middleware.
  matcher: ['/dashboard/:path*', '/cases/:path*'],
}
