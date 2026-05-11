'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Download, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeekNav } from '@/components/week-nav'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  formatLocalTime,
  formatDuration,
  elapsedSeconds,
  getWeekRange,
} from '@/lib/utils'
import type { DriveSession, Waypoint } from '@/lib/db'

// Leaflet must never run on the server
const RouteViewMap = dynamic(
  () => import('@/components/route-view-map').then((m) => m.RouteViewMap),
  { ssr: false }
)

export function DriveReportTable() {
  const [weekStart, setWeekStart] = useState(() => getWeekRange().start)
  const [drives, setDrives] = useState<DriveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [routeDrive, setRouteDrive] = useState<DriveSession | null>(null)

  const load = useCallback(async (ws: string) => {
    setLoading(true)
    const { start, end } = rangeFromWeekStart(ws)
    const res = await fetch(`/api/reports/drives?from=${start}&to=${end}`)
    if (res.ok) setDrives(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const downloadCSV = () => {
    const header = 'ID,Date,Start Time,End Time,Duration,Destination'
    const rows = drives.map((d) => {
      const dur = d.end_time ? elapsedSeconds(d.start_time, d.end_time) : null
      return [
        d.id,
        new Date(d.start_time).toLocaleDateString(),
        formatLocalTime(d.start_time),
        d.end_time ? formatLocalTime(d.end_time) : '(active)',
        dur != null ? formatDuration(dur) : '(active)',
        `"${d.destination.replace(/"/g, '""')}"`,
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    downloadFile(csv, `drive-report-${weekStart.slice(0, 10)}.csv`)
  }

  const totalSeconds = drives.reduce((acc, d) => {
    return acc + (d.end_time ? elapsedSeconds(d.start_time, d.end_time) : 0)
  }, 0)

  // Parse route_data JSON once — returns [] if missing or invalid
  const parseRoute = (d: DriveSession): Waypoint[] => {
    if (!d.route_data) return []
    try { return JSON.parse(d.route_data) } catch { return [] }
  }

  const routeWaypoints = routeDrive ? parseRoute(routeDrive) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <WeekNav weekStart={weekStart} onChange={(ws) => setWeekStart(ws)} />
        <Button variant="outline" size="sm" onClick={downloadCSV} disabled={drives.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Loading…</p>
      ) : drives.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No drives this week.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drives.map((d) => {
                const dur = d.end_time ? elapsedSeconds(d.start_time, d.end_time) : null
                const hasRoute = !!d.route_data
                return (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(d.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatLocalTime(d.start_time)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d.end_time ? formatLocalTime(d.end_time) : (
                        <span className="text-amber-400 text-xs font-medium">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {dur != null ? formatDuration(dur) : '—'}
                    </TableCell>
                    <TableCell>{d.destination}</TableCell>
                    <TableCell>
                      {hasRoute && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-sky-400 hover:text-sky-300"
                          onClick={() => setRouteDrive(d)}
                          title="View route"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="text-sm text-right text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatDuration(totalSeconds)}</span>
            {' · '}
            {drives.length} drive{drives.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Route viewer dialog */}
      <Dialog open={!!routeDrive} onOpenChange={(open) => { if (!open) setRouteDrive(null) }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-base">
              {routeDrive?.destination}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {routeDrive && new Date(routeDrive.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </DialogTitle>
          </DialogHeader>
          {routeWaypoints.length > 0 ? (
            <RouteViewMap waypoints={routeWaypoints} />
          ) : (
            <p className="text-center text-muted-foreground py-16 text-sm">No route data for this drive.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function rangeFromWeekStart(weekStart: string) {
  const start = new Date(weekStart)
  const end = new Date(start.getTime() + 7 * 86400_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
