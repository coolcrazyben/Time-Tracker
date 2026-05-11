import { NextResponse } from 'next/server'
import { getActiveTimeSession, clockIn } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/sessions — returns the active session (if any)
export async function GET() {
  try {
    const active = await getActiveTimeSession()
    return NextResponse.json({ active })
  } catch (err) {
    console.error('GET /api/sessions', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions — clock in
export async function POST(req: Request) {
  try {
    // Prevent double clock-in
    const existing = await getActiveTimeSession()
    if (existing) {
      return NextResponse.json(
        { error: 'Already clocked in', session: existing },
        { status: 409 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const session = await clockIn(body.label, body.notes)
    return NextResponse.json(session, { status: 201 })
  } catch (err) {
    console.error('POST /api/sessions', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
