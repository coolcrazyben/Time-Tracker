import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format seconds → "1h 23m 45s" */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/** Format seconds → "1:23:45" */
export function formatDurationClock(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format seconds → "1h 23m" (no seconds, for summary cards) */
export function formatHoursMinutes(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '0m'
  if (h === 0) return `${m}m`
  return `${h}h ${m > 0 ? `${m}m` : ''}`
}

/** Returns start/end of today in local time as ISO strings */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const end = new Date(start.getTime() + 86400_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Returns start/end of the ISO week containing `date` (Mon–Sun by default, Sun start optional) */
export function getWeekRange(date: Date = new Date(), startOnSunday = true): { start: string; end: string } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday
  const diff = startOnSunday ? day : (day === 0 ? 6 : day - 1)
  const start = new Date(d.getTime() - diff * 86400_000)
  const end = new Date(start.getTime() + 7 * 86400_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Format an ISO date string to local date+time */
export function formatLocalDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format an ISO date string to local time only */
export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Elapsed seconds between two ISO strings (or from start to now) */
export function elapsedSeconds(startIso: string, endIso?: string): number {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  return Math.floor((end - start) / 1000)
}

/** Format a week label for display, e.g. "May 5 – May 11" */
export function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(start.getTime() + 6 * 86400_000)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`
}

/** Shift a week forward (+1) or backward (-1) */
export function shiftWeek(weekStart: string, direction: 1 | -1): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + direction * 7)
  return d.toISOString()
}
