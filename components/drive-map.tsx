'use client'

import { useEffect, useRef } from 'react'
import type { Waypoint } from '@/lib/db'
import 'leaflet/dist/leaflet.css'

interface DriveMapProps {
  onWaypointsChange: (waypoints: Waypoint[]) => void
}

export function DriveMap({ onWaypointsChange }: DriveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Keep callback in a ref so the effect never needs to re-run when it changes
  const callbackRef = useRef(onWaypointsChange)
  useEffect(() => { callbackRef.current = onWaypointsChange })

  useEffect(() => {
    if (!containerRef.current) return
    let map: import('leaflet').Map
    let polyline: import('leaflet').Polyline
    let currentMarker: import('leaflet').CircleMarker | null = null
    let watchId: number | null = null

    const waypoints: Waypoint[] = []
    let lastLat: number | null = null
    let lastLng: number | null = null
    let lastSampleMs = 0

    async function init() {
      const L = (await import('leaflet')).default

      map = L.map(containerRef.current!, { zoomControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      polyline = L.polyline([], { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(map)

      // Default center while waiting for first GPS fix
      map.setView([39.5, -98.35], 5)

      if (!navigator.geolocation) return

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          const now = Date.now()

          // Sample if: first point, moved >10 m, or >15 s since last sample
          const dist = lastLat !== null ? haversineM(lastLat, lastLng!, lat, lng) : Infinity
          const shouldSample = waypoints.length === 0 || dist > 10 || (now - lastSampleMs) > 15_000

          if (shouldSample && waypoints.length < 1000) {
            waypoints.push({ lat, lng, ts: now })
            lastLat = lat
            lastLng = lng
            lastSampleMs = now
            callbackRef.current([...waypoints])
          }

          // Update polyline
          polyline.setLatLngs(waypoints.map(w => [w.lat, w.lng] as [number, number]))

          // Move/place current-position marker
          if (currentMarker) {
            currentMarker.setLatLng([lat, lng])
          } else {
            currentMarker = L.circleMarker([lat, lng], {
              radius: 9,
              color: '#fff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 2.5,
            }).addTo(map)
            // Place start dot (green) on first fix
            L.circleMarker([lat, lng], {
              radius: 7,
              color: '#fff',
              fillColor: '#22c55e',
              fillOpacity: 1,
              weight: 2,
            }).addTo(map)
            map.setView([lat, lng], 16)
          }

          // Keep current position in view
          map.panTo([lat, lng], { animate: true, duration: 0.5 })
        },
        (err) => console.warn('GPS error:', err.message),
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 }
      )
    }

    init()

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      map?.remove()
    }
  }, []) // intentionally empty — callback changes are handled via callbackRef

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-md">
      <div ref={containerRef} style={{ height: 340, width: '100%' }} />
    </div>
  )
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
