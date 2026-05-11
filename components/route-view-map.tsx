'use client'

import { useEffect, useRef } from 'react'
import type { Waypoint } from '@/lib/db'
import 'leaflet/dist/leaflet.css'

interface RouteViewMapProps {
  waypoints: Waypoint[]
}

export function RouteViewMap({ waypoints }: RouteViewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || waypoints.length === 0) return
    let map: import('leaflet').Map

    async function init() {
      const L = (await import('leaflet')).default

      map = L.map(containerRef.current!)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const latlngs = waypoints.map(w => [w.lat, w.lng] as [number, number])
      const poly = L.polyline(latlngs, { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(map)

      // Start marker — green
      L.circleMarker(latlngs[0], {
        radius: 9,
        color: '#fff',
        fillColor: '#22c55e',
        fillOpacity: 1,
        weight: 2.5,
      }).addTo(map)

      // End marker — red
      if (latlngs.length > 1) {
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 9,
          color: '#fff',
          fillColor: '#ef4444',
          fillOpacity: 1,
          weight: 2.5,
        }).addTo(map)
      }

      map.fitBounds(poly.getBounds(), { padding: [28, 28] })
    }

    init()
    return () => { map?.remove() }
  }, [waypoints])

  return <div ref={containerRef} style={{ height: 380, width: '100%' }} />
}
