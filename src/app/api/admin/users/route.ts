import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/adminClient'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, user_type, ilaa_status, is_blocked, subscription_status, subscription_expires_at, created_at, ilaa_id_number')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const users = (profiles ?? []).map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
  }))

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { action, userId } = await request.json()

  if (action === 'block' || action === 'unblock') {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_blocked: action === 'block' })
      .eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
