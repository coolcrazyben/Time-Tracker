'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Car, Square, Loader2 } from 'lucide-react'
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
import type { DriveSession, Waypoint } from '@/lib/db'

const DriveMap = dynamic(
  () => import('@/components/drive-map').then((m) => m.DriveMap),
  { ssr: false }
)

interface DriveButtonProps {
  activeDrive: DriveSession | null
  onDriveChange: () => void
}

export function DriveButton({ activeDrive, onDriveChange }: DriveButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [destination, setDestination] = useState('')
  const [isPending, startTransition] = useTransition()
  const [destError, setDestError] = useState('')
  const [distanceMiles, setDistanceMiles] = useState(0)

  const waypointsRef = useRef<Waypoint[]>([])

  const handleWaypointsChange = useCallback((waypoints: Waypoint[], totalMeters: number) => {
    waypointsRef.current = waypoints
    setDistanceMiles(totalMeters * 0.000621371)
  }, [])

  const handleStartDrive = () => {
    setDestination('')
    setDestError('')
    waypointsRef.current = []
    setDistanceMiles(0)
    setDialogOpen(true)
  }

  const confirmStart = () => {
    if (!destination.trim()) {
      setDestError('Destination is required')
      return
    }
    setDialogOpen(false)
    startTransition(async () => {
      await fetch('/api/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destination.trim() }),
      })
      onDriveChange()
    })
  }

  const handleStopDrive = () => {
    if (!activeDrive) return
    const routeData =
      waypointsRef.current.length > 0
        ? JSON.stringify(waypointsRef.current)
        : null
    startTransition(async () => {
      await fetch(`/api/drives/${activeDrive.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_data: routeData }),
      })
      waypointsRef.current = []
      setDistanceMiles(0)
      onDriveChange()
    })
  }

  const isDriving = !!activeDrive

  return (
    <>
      <div className="flex flex-col items-center gap-3 w-full">
        <Button
          onClick={isDriving ? handleStopDrive : handleStartDrive}
          disabled={isPending}
          size="lg"
          className={[
            'h-14 px-8 text-base font-semibold gap-2 rounded-full',
            isDriving
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-sky-700 hover:bg-sky-600 text-white',
          ].join(' ')}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isDriving ? (
            <>
              <Square className="h-4 w-4 fill-current" />
              Stop Drive
            </>
          ) : (
            <>
              <Car className="h-5 w-5" />
              Start Drive
            </>
          )}
        </Button>

        {isDriving && activeDrive && (
          <div className="text-center space-y-0.5">
            <LiveTimer
              startTime={activeDrive.start_time}
              className="text-2xl font-mono font-semibold tabular-nums text-amber-400"
            />
            <p className="text-sm text-muted-foreground">{activeDrive.destination}</p>
            {distanceMiles >= 0.01 && (
              <p className="text-sm font-medium text-amber-300">
                {distanceMiles.toFixed(2)} mi
              </p>
            )}
          </div>
        )}

        {isDriving && (
          <div className="w-full mt-1">
            <DriveMap onWaypointsChange={handleWaypointsChange} />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Drive</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dest">Destination</Label>
              <Input
                id="dest"
                placeholder="e.g. Client office, Warehouse"
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setDestError('') }}
                onKeyDown={(e) => e.key === 'Enter' && confirmStart()}
                autoFocus
              />
              {destError && <p className="text-xs text-destructive">{destError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStart}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
