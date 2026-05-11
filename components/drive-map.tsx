'use client'

import { useEffect, useRef } from 'react'
import type { Waypoint } from '@/lib/db'
import 'leaflet/dist/leaflet.css'

interface DriveMapProps {
  onWaypointsChange: (waypoints: Waypoint[], totalMeters: number) => void
}

export function DriveMap({ onWaypointsChange }: DriveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onWaypointsChange)
  useEffect(() => { callbackRef.current = onWaypointsChange })

  useEffect(() => {
    if (!containerRef.current) return
    let map: import('leaflet').Map
    let polyline: import('leaflet').Polyline
    let currentMarker: import('leaflet').CircleMarker | null = null
    let watchId: number | null = null

    // Store every GPS fix — the more the better for route accuracy
    const waypoints: Waypoint[] = []
    let totalMeters = 0
    let lastLat: number | null = null
    let lastLng: number | null = null

    async function init() {
      const L = (await import('leaflet')).default

      map = L.map(containerRef.current!, { zoomControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      polyline = L.polyline([], { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(map)
      map.setView([39.5, -98.35], 5)

      if (!navigator.geolocation) return

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          const ts = Date.now()

          // Skip exact duplicates (same fix served twice)
          if (lat === lastLat && lng === lastLng) return

          // Accumulate distance before pushing the new point
          if (lastLat !== null) {
            totalMeters += haversineM(lastLat, lastLng!, lat, lng)
          }

          if (waypoints.length < 2000) {
            waypoints.push({ lat, lng, ts })
          }
          lastLat = lat
          lastLng = lng

          callbackRef.current([...waypoints], totalMeters)

          // Draw every point so the route follows the road
          polyline.setLatLngs(waypoints.map(w => [w.lat, w.lng] as [number, number]))

          // Move or place the current-position marker
          if (currentMarker) {
            currentMarker.setLatLng([lat, lng])
          } else {
            // Green start dot
            L.circleMarker([lat, lng], {
              radius: 7,
              color: '#fff',
              fillColor: '#22c55e',
              fillOpacity: 1,
              weight: 2,
            }).addTo(map)
            // Blue current-position dot
            currentMarker = L.circleMarker([lat, lng], {
              radius: 9,
              color: '#fff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 2.5,
            }).addTo(map)
            map.setView([lat, lng], 16)
          }

          map.panTo([lat, lng], { animate: true, duration: 0.5 })
        },
        (err) => console.warn('GPS error:', err.message),
        // maximumAge: 0 → always request a fresh fix, never serve cached coords
        { enableHighAccuracy: true, maximumAge: 0, timeout: 60_000 }
      )
    }

    init()

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      map?.remove()
    }
  }, [])

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-md">
      <div ref={containerRef} style={{ height: 340, width: '100%' }} />
    </div>
  )
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
