/**
 * Shared helper for admin API routes.
 * Verifies the caller is aiactuar@gmail.com using the service-role client.
 */
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function verifyAdmin(request: NextRequest) {
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user || user.email !== 'aiactuar@gmail.com') return null
  return user
}
