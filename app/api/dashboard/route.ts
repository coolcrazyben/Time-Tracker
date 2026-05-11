import { NextResponse } from 'next/server'
import { getTodayTimeSeconds, getWeekTimeSeconds, getWeekDriveStats } from '@/lib/db'
import { getTodayRange, getWeekRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/dashboard?todayStart=...&todayEnd=...&weekStart=...&weekEnd=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    // Accept client-supplied ranges (local-time-aware) or fall back to server UTC
    const todayStart = url.searchParams.get('todayStart') ?? getTodayRange().start
    const todayEnd   = url.searchParams.get('todayEnd')   ?? getTodayRange().end
    const weekStart  = url.searchParams.get('weekStart')  ?? getWeekRange().start
    const weekEnd    = url.searchParams.get('weekEnd')    ?? getWeekRange().end

    const [todaySeconds, weekSeconds, driveStats] = await Promise.all([
      getTodayTimeSeconds(todayStart, todayEnd),
      getWeekTimeSeconds(weekStart, weekEnd),
      getWeekDriveStats(weekStart, weekEnd),
    ])

    return NextResponse.json({
      todaySeconds,
      weekSeconds,
      weekDriveCount: driveStats.count,
      weekDriveSeconds: driveStats.totalSeconds,
    })
  } catch (err) {
    console.error('GET /api/dashboard', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
