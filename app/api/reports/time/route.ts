import { NextResponse } from 'next/server'
import { getTimeSessionsInRange } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/reports/time?from=<ISO>&to=<ISO>
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to   = url.searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to params are required' }, { status: 400 })
    }

    const sessions = await getTimeSessionsInRange(from, to)
    return NextResponse.json(sessions)
  } catch (err) {
    console.error('GET /api/reports/time', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
