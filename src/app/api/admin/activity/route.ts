import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/adminClient'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  const [
    { data: cases },
    { data: profiles },
  ] = await Promise.all([
    supabaseAdmin
      .from('cases')
      .select('id, case_number, party_a_name, party_b_name, created_at, actuary_id')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  // Get emails for case actuary_ids
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const caseEvents = (cases ?? []).map(c => ({
    type: 'case' as const,
    label: `תיק ${c.case_number} נוצר — ${c.party_a_name} / ${c.party_b_name}`,
    actor: emailMap.get(c.actuary_id) ?? c.actuary_id,
    createdAt: c.created_at,
  }))

  const userEvents = (profiles ?? []).map(p => ({
    type: 'user' as const,
    label: `משתמש חדש נרשם: ${p.full_name}`,
    actor: emailMap.get(p.id) ?? '',
    createdAt: p.created_at,
  }))

  const events = [...caseEvents, ...userEvents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return NextResponse.json({ events })
}
