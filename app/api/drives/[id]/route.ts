import { NextResponse } from 'next/server'
import { stopDrive } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/drives/[id] — stop a drive
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
    await stopDrive(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/drives/[id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
