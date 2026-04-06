import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/adminClient'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { count: pendingIlaa },
    { count: totalCases },
    { count: newUsersThisMonth },
    { data: recentCases },
    { data: recentProfiles },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('ilaa_status', 'pending'),
    supabaseAdmin.from('cases').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabaseAdmin.from('cases').select('id, case_number, party_a_name, party_b_name, created_at, actuary_id').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(8),
  ])

  // Merge and sort activity
  const caseActivity = (recentCases ?? []).map(c => ({
    type: 'case',
    label: `תיק חדש: ${c.case_number} — ${c.party_a_name} / ${c.party_b_name}`,
    createdAt: c.created_at,
  }))
  const userActivity = (recentProfiles ?? []).map(p => ({
    type: 'user',
    label: `משתמש חדש: ${p.full_name}`,
    createdAt: p.created_at,
  }))
  const activity = [...caseActivity, ...userActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    pendingIlaa: pendingIlaa ?? 0,
    totalCases: totalCases ?? 0,
    newUsersThisMonth: newUsersThisMonth ?? 0,
    activity,
  })
}
