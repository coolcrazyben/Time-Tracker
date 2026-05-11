import { NextResponse } from 'next/server'
import { stopDrive } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/drives/[id] — stop a drive
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    let routeData: string | null = null
    try {
      const body = await req.json()
      if (body?.route_data) routeData = body.route_data
    } catch { /* no body or not JSON */ }
    await stopDrive(id, routeData)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/drives/[id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
