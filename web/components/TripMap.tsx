"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { ScheduledStopT } from "@/lib/transit/types";

// Suppress Leaflet's default-icon URL lookup warning under bundlers.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

/** A circular bus marker rendered as inline HTML. */
const busIcon = L.divIcon({
  className: "transit-bus-marker",
  html: `
    <div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: #2563eb;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 4px rgba(37,99,235,0.35);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    ">🚌</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
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
        .filter((x): x is { stop: ScheduledStopT; lat: number; lon: number; idx: number } => x !== null),
    [scheduledStops]
  );

  if (points.length === 0) {
    return <div className="text-white/70">No coordinates to plot.</div>;
  }

  // Split the polyline into "passed" (gray) and "upcoming" (red) segments.
  // The split point is at the next stop, so the segment up to it shows the
  // bus's current leg.
  const splitAt = Math.max(0, Math.min(points.length, nextStopIndex));
  const passed = points.slice(0, splitAt).map((p) => [p.lat, p.lon] as [number, number]);
  const upcoming = points.slice(Math.max(0, splitAt - 1)).map((p) => [p.lat, p.lon] as [number, number]);
  const allPositions: [number, number][] = points.map((p) => [p.lat, p.lon]);

  // Bus marker sits at the next stop (where it's about to arrive). If the
  // trip is finished, no bus is shown.
  const busPos: [number, number] | null =
    !finished && splitAt > 0 && splitAt <= points.length
      ? [points[Math.min(splitAt, points.length - 1)].lat, points[Math.min(splitAt, points.length - 1)].lon]
      : !finished && splitAt === 0 && points.length > 0
        ? [points[0].lat, points[0].lon]
        : null;

  const center: [number, number] = busPos ?? [points[0].lat, points[0].lon];

  return (
    <div className="h-[320px] overflow-hidden rounded-2xl ring-1 ring-white/20">
      <MapContainer center={center} zoom={13} scrollWheelZoom>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds points={allPositions} />

        {passed.length >= 2 && (
          <Polyline
            positions={passed}
            pathOptions={{ color: "#9ca3af", weight: 4, opacity: 0.6 }}
          />
        )}
        {upcoming.length >= 2 && (
          <Polyline
            positions={upcoming}
            pathOptions={{ color: "#ef4444", weight: 4 }}
          />
        )}

        {points.map((p) => {
          const isPassed = p.idx < splitAt;
          return (
            <CircleMarker
              key={p.stop.key}
              center={[p.lat, p.lon]}
              radius={isPassed ? 4 : 6}
              pathOptions={{
                color: "#ffffff",
                fillColor: isPassed ? "#9ca3af" : "#3b82f6",
                fillOpacity: isPassed ? 0.5 : 1,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{p.stop.stop?.name}</div>
                  <div className="text-xs text-gray-500">#{p.stop.stop?.number}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {busPos && <Marker position={busPos} icon={busIcon} />}
      </MapContainer>
    </div>
  );
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);
  return null;
}
