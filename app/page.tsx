import { DashboardCards } from '@/components/dashboard-cards'
import {
  getActiveTimeSession,
  getActiveDriveSession,
  getWeekTimeSeconds,
  getTodayTimeSeconds,
  getWeekDriveStats,
} from '@/lib/db'
import { getTodayRange, getWeekRange } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { start: todayStart, end: todayEnd } = getTodayRange()
  const { start: weekStart, end: weekEnd } = getWeekRange()

  try {
    const [activeSession, activeDrive, todaySeconds, weekSeconds, driveStats] = await Promise.all([
      getActiveTimeSession(),
      getActiveDriveSession(),
      getTodayTimeSeconds(todayStart, todayEnd),
      getWeekTimeSeconds(weekStart, weekEnd),
      getWeekDriveStats(weekStart, weekEnd),
    ])

    return (
      <DashboardCards
        initialSession={activeSession}
        initialDrive={activeDrive}
        initialStats={{
          todaySeconds,
          weekSeconds,
          weekDriveCount: driveStats.count,
          weekDriveSeconds: driveStats.totalSeconds,
        }}
      />
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">Database not connected</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Could not connect to the database. Make sure a Postgres (Neon) database is linked to
          this Vercel project and the <code className="text-foreground">DATABASE_URL</code> or{' '}
          <code className="text-foreground">POSTGRES_URL</code> environment variable is set.
        </p>
        <details className="text-xs text-muted-foreground max-w-md">
          <summary className="cursor-pointer hover:text-foreground">Error details</summary>
          <pre className="mt-2 text-left bg-muted rounded p-3 overflow-auto">{message}</pre>
        </details>
      </div>
    )
  }
}
