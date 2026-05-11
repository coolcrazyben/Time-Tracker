'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeekNav } from '@/components/week-nav'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  formatLocalDateTime,
  formatLocalTime,
  formatDuration,
  elapsedSeconds,
  getWeekRange,
} from '@/lib/utils'
import type { TimeSession } from '@/lib/db'

export function TimeReportTable() {
  const [weekStart, setWeekStart] = useState(() => getWeekRange().start)
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (ws: string) => {
    setLoading(true)
    const { start, end } = rangeFromWeekStart(ws)
    const res = await fetch(`/api/reports/time?from=${start}&to=${end}`)
    if (res.ok) setSessions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const handleWeekChange = (ws: string) => {
    setWeekStart(ws)
  }

  const downloadCSV = () => {
    const header = 'ID,Date,Clock In,Clock Out,Duration,Label,Notes'
    const rows = sessions.map((s) => {
      const dur = s.end_time ? elapsedSeconds(s.start_time, s.end_time) : null
      return [
        s.id,
        new Date(s.start_time).toLocaleDateString(),
        formatLocalTime(s.start_time),
        s.end_time ? formatLocalTime(s.end_time) : '(active)',
        dur != null ? formatDuration(dur) : '(active)',
        `"${(s.label ?? '').replace(/"/g, '""')}"`,
        `"${(s.notes ?? '').replace(/"/g, '""')}"`,
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    downloadFile(csv, `time-report-${weekStart.slice(0, 10)}.csv`)
  }

  const totalSeconds = sessions.reduce((acc, s) => {
    return acc + (s.end_time ? elapsedSeconds(s.start_time, s.end_time) : 0)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <WeekNav weekStart={weekStart} onChange={handleWeekChange} />
        <Button variant="outline" size="sm" onClick={downloadCSV} disabled={sessions.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No sessions this week.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="hidden sm:table-cell">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const dur = s.end_time ? elapsedSeconds(s.start_time, s.end_time) : null
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(s.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatLocalTime(s.start_time)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.end_time ? formatLocalTime(s.end_time) : (
                        <span className="text-emerald-400 text-xs font-medium">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {dur != null ? formatDuration(dur) : '—'}
                    </TableCell>
                    <TableCell>{s.label ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{s.notes ?? '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="text-sm text-right text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatDuration(totalSeconds)}</span>
          </p>
        </>
      )}
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
