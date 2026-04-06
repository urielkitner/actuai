import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { fullName, email, idNumber } = await request.json()

  const { error } = await resend.emails.send({
    from: 'ActuAi <onboarding@resend.dev>',
    to: 'aiactuar@gmail.com',
    subject: 'בקשת אימות ILAA חדשה - ActuAi',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>בקשת אימות ILAA חדשה</h2>
        <p>משתמש חדש ביקש אימות חברות ב-ILAA:</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
          <tr><td style="padding: 8px; font-weight: bold;">שם מלא:</td><td style="padding: 8px;">${fullName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">אימייל:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">תעודת זהות:</td><td style="padding: 8px;">${idNumber}</td></tr>
        </table>
        <p style="margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://actuai.vercel.app'}/admin/ilaa"
             style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
            עבור לדף הניהול
          </a>
        </p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
