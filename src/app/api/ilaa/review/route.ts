import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Service-role client — bypasses RLS to update any profile row
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { profileId, action, userEmail, userFullName } = await request.json()

  if (!['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Verify the calling user is the admin
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user || user.email !== 'aiactuar@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Update profile status
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ ilaa_status: action })
    .eq('id', profileId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send email to the user
  const isApproved = action === 'approved'
  const subject = isApproved
    ? 'אומתת בהצלחה כחבר ILAA ב-ActuAi'
    : 'עדכון בנוגע לבקשת אימות ILAA שלך ב-ActuAi'
  const bodyHtml = isApproved
    ? `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>אימות ILAA הושלם בהצלחה!</h2>
        <p>שלום ${userFullName},</p>
        <p>אומתת בהצלחה כחבר ILAA באתר ActuAi! כעת תוכל להתחבר למערכת.</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://actuai.vercel.app'}/auth"
              style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          כניסה למערכת
        </a></p>
      </div>`
    : `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>בקשת אימות ILAA</h2>
        <p>שלום ${userFullName},</p>
        <p>לצערנו, לא הצלחנו לאמת את חברותך ב-ILAA. אנא צור קשר עם התמיכה לפרטים נוספים.</p>
      </div>`

  console.log('[ilaa/review] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
  console.log('[ilaa/review] RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.slice(0, 8))
  console.log('[ilaa/review] Sending email to:', userEmail, 'action:', action)

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: 'ActuAi <onboarding@resend.dev>',
    to: userEmail,
    subject,
    html: bodyHtml,
  })

  console.log('[ilaa/review] Resend response — data:', JSON.stringify(emailData), 'error:', JSON.stringify(emailError))

  if (emailError) {
    console.error('[ilaa/review] Resend error:', emailError)
    // Profile was already updated — return partial success with email error details
    return NextResponse.json({ ok: true, emailError: emailError.message, emailDetails: emailError })
  }

  return NextResponse.json({ ok: true, emailId: emailData?.id })
}
