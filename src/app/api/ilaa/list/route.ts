import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  // Verify admin
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user || user.email !== 'aiactuar@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Fetch pending profiles
  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, ilaa_id_number, ilaa_status')
    .eq('ilaa_status', 'pending')

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profileRows || profileRows.length === 0) {
    return NextResponse.json({ profiles: [] })
  }

  // Fetch emails from auth.users for each profile id
  const ids = profileRows.map(p => p.id)
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  })

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const emailMap = new Map(users.map(u => [u.id, u.email ?? '']))

  const profiles = profileRows.map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
  })).filter(p => ids.includes(p.id))

  return NextResponse.json({ profiles })
}
