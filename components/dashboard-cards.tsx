'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock, Car, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClockButton } from '@/components/clock-button'
import { DriveButton } from '@/components/drive-button'
import { formatHoursMinutes, formatDuration, getTodayRange, getWeekRange } from '@/lib/utils'
import type { TimeSession, DriveSession } from '@/lib/db'

interface DashboardStats {
  todaySeconds: number
  weekSeconds: number
  weekDriveCount: number
  weekDriveSeconds: number
}

interface DashboardCardsProps {
  initialSession: TimeSession | null
  initialDrive: DriveSession | null
  initialStats: DashboardStats
}

export function DashboardCards({ initialSession, initialDrive, initialStats }: DashboardCardsProps) {
  const [session, setSession] = useState<TimeSession | null>(initialSession)
  const [drive, setDrive] = useState<DriveSession | null>(initialDrive)
  const [stats, setStats] = useState<DashboardStats>(initialStats)

  const refreshStats = useCallback(async () => {
    const { start: todayStart, end: todayEnd } = getTodayRange()
    const { start: weekStart, end: weekEnd } = getWeekRange()
    const params = new URLSearchParams({ todayStart, todayEnd, weekStart, weekEnd })
    const res = await fetch(`/api/dashboard?${params}`)
    if (res.ok) setStats(await res.json())
  }, [])

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/sessions')
    if (res.ok) {
      const data = await res.json()
      setSession(data.active ?? null)
    }
    await refreshStats()
  }, [refreshStats])

  const refreshDrive = useCallback(async () => {
    const res = await fetch('/api/drives')
    if (res.ok) {
      const data = await res.json()
      setDrive(data.active ?? null)
    }
    await refreshStats()
  }, [refreshStats])

  // Refresh stats periodically while a session or drive is active
  useEffect(() => {
    if (!session && !drive) return
    const id = setInterval(refreshStats, 30_000)
    return () => clearInterval(id)
  }, [session, drive, refreshStats])

  const isActive = !!session || !!drive

  return (
    <div className="space-y-8">
      {/* Status banner */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {session && (
          <Badge variant="success" className="text-sm px-3 py-1 gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Clocked In
          </Badge>
        )}
        {drive && (
          <Badge variant="warning" className="text-sm px-3 py-1 gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Driving
          </Badge>
        )}
        {!isActive && (
          <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
            <Activity className="h-3 w-3 mr-1" />
            Idle
          </Badge>
        )}
      </div>

      {/* Action buttons — stack vertically when map is visible */}
      <div className={drive
        ? 'flex flex-col items-center gap-6 w-full'
        : 'flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16'
      }>
        <ClockButton activeSession={session} onSessionChange={refreshSession} />
        <div className={drive ? 'w-full' : ''}>
          <DriveButton activeDrive={drive} onDriveChange={refreshDrive} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4 text-emerald-400" />}
          label="Today"
          value={formatHoursMinutes(stats.todaySeconds)}
          sub="hours worked"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-sky-400" />}
          label="This Week"
          value={formatHoursMinutes(stats.weekSeconds)}
          sub="hours worked"
        />
        <StatCard
          icon={<Car className="h-4 w-4 text-amber-400" />}
          label="Drives"
          value={String(stats.weekDriveCount)}
          sub="this week"
        />
        <StatCard
          icon={<Car className="h-4 w-4 text-violet-400" />}
          label="Drive Time"
          value={formatDuration(stats.weekDriveSeconds)}
          sub="this week"
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
