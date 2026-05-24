"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { ScheduledStopT } from "@/lib/transit/types";

// Suppress Leaflet's default-icon URL lookup warning under bundlers.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

/**
 * Pulsing circular bus marker. The CSS lives in globals.css under .bus-marker
 * (with a ::before pseudo-element doing the ping animation) so we get a real
 * pulsing halo rather than just an emoji.
 */
const busIcon = L.divIcon({
  className: "transit-bus-marker",
  html: `
    <div class="bus-marker">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"
           stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
        <circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>
      </svg>
    </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

interface Props {
  scheduledStops: ScheduledStopT[];
  /** Index of the next stop the bus will reach. Stops before this are "passed". */
  nextStopIndex: number;
  /** Whether the trip has already ended. Hides the bus marker. */
  finished: boolean;
}

export default function TripMap({ scheduledStops, nextStopIndex, finished }: Props) {
  const points = useMemo(
    () =>
      scheduledStops
        .map((s, idx) => {
          const lat = s.stop?.centre?.geographic?.latitude;
          const lon = s.stop?.centre?.geographic?.longitude;
          return lat != null && lon != null ? { stop: s, lat, lon, idx } : null;
        })
        .filter(
          (x): x is { stop: ScheduledStopT; lat: number; lon: number; idx: number } => x !== null
        ),
    [scheduledStops]
  );

  if (points.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-white/55">
        No coordinates to plot.
      </div>
    );
  }

  // Split the polyline into "passed" (gray) and "upcoming" (cyan) segments.
  const splitAt = Math.max(0, Math.min(points.length, nextStopIndex));
  const passed = points.slice(0, splitAt).map((p) => [p.lat, p.lon] as [number, number]);
  const upcoming = points
    .slice(Math.max(0, splitAt - 1))
    .map((p) => [p.lat, p.lon] as [number, number]);
  const allPositions: [number, number][] = points.map((p) => [p.lat, p.lon]);

  // Bus marker sits at the next stop. Hidden if the trip is finished.
  const busPos: [number, number] | null = !finished
    ? splitAt > 0 && splitAt <= points.length
      ? [
          points[Math.min(splitAt, points.length - 1)].lat,
          points[Math.min(splitAt, points.length - 1)].lon,
        ]
      : splitAt === 0 && points.length > 0
        ? [points[0].lat, points[0].lon]
        : null
    : null;

  const center: [number, number] = busPos ?? [points[0].lat, points[0].lon];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-glow">
      <div className="h-[360px]">
        <MapContainer center={center} zoom={13} scrollWheelZoom>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <FitBounds points={allPositions} />

          {passed.length >= 2 && (
            <Polyline
              positions={passed}
              pathOptions={{ color: "#475569", weight: 3, opacity: 0.6 }}
            />
          )}
          {upcoming.length >= 2 && (
            <Polyline
              positions={upcoming}
              pathOptions={{ color: "#22d3ee", weight: 4, opacity: 0.95 }}
            />
          )}

          {points.map((p) => {
            const isPassed = p.idx < splitAt;
            return (
              <CircleMarker
                key={p.stop.key}
                center={[p.lat, p.lon]}
                radius={isPassed ? 3 : 5}
                pathOptions={{
                  color: "#0f172a",
                  fillColor: isPassed ? "#64748b" : "#22d3ee",
                  fillOpacity: isPassed ? 0.6 : 1,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.stop.stop?.name}</div>
                    <div className="text-xs text-gray-400">#{p.stop.stop?.number}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {busPos && <Marker position={busPos} icon={busIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}
