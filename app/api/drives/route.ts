import { NextResponse } from 'next/server'
import { getActiveDriveSession, startDrive } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/drives — returns the active drive (if any)
export async function GET() {
  try {
    const active = await getActiveDriveSession()
    return NextResponse.json({ active })
  } catch (err) {
    console.error('GET /api/drives', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/drives — start a drive
export async function POST(req: Request) {
  try {
    // Prevent double drive
    const existing = await getActiveDriveSession()
    if (existing) {
      return NextResponse.json(
        { error: 'Drive already in progress', drive: existing },
        { status: 409 }
      )
    }

    const body = await req.json().catch(() => ({}))
    if (!body.destination || typeof body.destination !== 'string' || !body.destination.trim()) {
      return NextResponse.json({ error: 'destination is required' }, { status: 400 })
    }

    const drive = await startDrive(body.destination.trim())
    return NextResponse.json(drive, { status: 201 })
  } catch (err) {
    console.error('POST /api/drives', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
