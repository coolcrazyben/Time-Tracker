'use client'

import { useEffect, useState } from 'react'
import { elapsedSeconds, formatDurationClock } from '@/lib/utils'

interface LiveTimerProps {
  startTime: string
  className?: string
}

export function LiveTimer({ startTime, className }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startTime))

  useEffect(() => {
    setElapsed(elapsedSeconds(startTime))
    const id = setInterval(() => setElapsed(elapsedSeconds(startTime)), 1000)
    return () => clearInterval(id)
  }, [startTime])

  return <span className={className}>{formatDurationClock(elapsed)}</span>
}
