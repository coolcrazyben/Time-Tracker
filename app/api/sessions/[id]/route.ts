import { NextResponse } from 'next/server'
import { clockOut } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/sessions/[id] — clock out
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await clockOut(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/sessions/[id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
