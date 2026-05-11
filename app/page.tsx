import { DashboardCards } from '@/components/dashboard-cards'
import {
  getActiveTimeSession,
  getActiveDriveSession,
  getWeekTimeSeconds,
  getTodayTimeSeconds,
  getWeekDriveStats,
} from '@/lib/db'
import { getTodayRange, getWeekRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { start: todayStart, end: todayEnd } = getTodayRange()
  const { start: weekStart, end: weekEnd } = getWeekRange()

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
}
