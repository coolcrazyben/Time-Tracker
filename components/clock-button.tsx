'use client'

import { useState, useTransition } from 'react'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LiveTimer } from '@/components/live-timer'
import type { TimeSession } from '@/lib/db'

interface ClockButtonProps {
  activeSession: TimeSession | null
  onSessionChange: () => void
}

export function ClockButton({ activeSession, onSessionChange }: ClockButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleClockIn = () => {
    setLabel('')
    setNotes('')
    setDialogOpen(true)
  }

  const confirmClockIn = () => {
    setDialogOpen(false)
    startTransition(async () => {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined, notes: notes.trim() || undefined }),
      })
      onSessionChange()
    })
  }

  const handleClockOut = () => {
    if (!activeSession) return
    startTransition(async () => {
      await fetch(`/api/sessions/${activeSession.id}`, { method: 'PATCH' })
      onSessionChange()
    })
  }

  const isClockedIn = !!activeSession

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={isPending}
          className={[
            'relative w-56 h-56 rounded-full font-bold text-xl tracking-widest uppercase',
            'transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring',
            'shadow-lg active:scale-95 select-none',
            isClockedIn
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50',
            isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {isPending ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          ) : isClockedIn ? (
            <div className="flex flex-col items-center gap-1">
              <LogOut className="h-7 w-7" />
              <span>Clock Out</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <LogIn className="h-7 w-7" />
              <span>Clock In</span>
            </div>
          )}
        </button>

        {isClockedIn && activeSession && (
          <div className="text-center space-y-1">
            <LiveTimer
              startTime={activeSession.start_time}
              className="text-4xl font-mono font-semibold tabular-nums text-emerald-400"
            />
            {activeSession.label && (
              <p className="text-sm text-muted-foreground">{activeSession.label}</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="label">Job / Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="label"
                placeholder="e.g. Client A, Deep work"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmClockIn()}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="notes"
                placeholder="Any notes for this session"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmClockIn()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmClockIn}>Start Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
