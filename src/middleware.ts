import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that never require authentication
const PUBLIC_ROUTES = ['/auth', '/pricing']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let public routes and the root splash through unconditionally
  if (pathname === '/' || PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Supabase v2 + our cookieStorage adapter writes the session under a cookie
  // named  sb-<project-ref>-auth-token  (the default storageKey).
  // We only need to confirm the cookie is present and non-empty here; the full
  // token validation happens client-side via supabase.auth.getSession() on
  // every page load, which also handles refresh automatically.
  const hasSession = request.cookies.getAll().some(
    c =>
      c.name.startsWith('sb-') &&
      c.name.endsWith('-auth-token') &&
      c.value.length > 0,
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    // Preserve destination so /auth/callback can redirect back after login
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
