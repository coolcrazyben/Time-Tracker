'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatWeekLabel, shiftWeek, getWeekRange } from '@/lib/utils'

interface WeekNavProps {
  weekStart: string
  onChange: (weekStart: string) => void
}

export function WeekNav({ weekStart, onChange }: WeekNavProps) {
  const currentWeekStart = getWeekRange().start
  const isCurrentWeek = weekStart.slice(0, 10) === currentWeekStart.slice(0, 10)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(shiftWeek(weekStart, -1))}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-medium min-w-[160px] text-center">
        {isCurrentWeek ? 'This Week' : formatWeekLabel(weekStart)}
      </span>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(shiftWeek(weekStart, 1))}
        disabled={isCurrentWeek}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
