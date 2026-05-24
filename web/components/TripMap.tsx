"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Bus, Route, Crosshair } from "lucide-react";
import type { ScheduledStopT } from "@/lib/transit/types";

// Suppress Leaflet's default-icon URL lookup warning under bundlers.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

/** Bus marker (pulsing halo handled in globals.css). */
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

/** Pulsing ring shown at the next stop, behind the bus marker. */
const nextStopRingIcon = L.divIcon({
  className: "transit-next-stop-ring",
  html: `<div class="next-stop-ring"></div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});

type ViewMode = "bus" | "full";

/** Number of stops on each side of the bus included in "Follow bus" mode. */
const WINDOW_BEHIND = 2;
const WINDOW_AHEAD = 4;

interface Props {
  scheduledStops: ScheduledStopT[];
  /** Index of the next stop the bus will reach. Stops before this are "passed". */
  nextStopIndex: number;
  /** Whether the trip has already ended. Hides the bus marker. */
  finished: boolean;
  /** Stop key of a stop the user clicked in the list — map will fly to it. */
  focusedStopKey?: string | null;
}

export default function TripMap({
  scheduledStops,
  nextStopIndex,
  finished,
  focusedStopKey,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("bus");
  // Ref to the underlying Leaflet map. Components rendered OUTSIDE
  // <MapContainer> (e.g. the floating Recenter button) can't use
  // react-leaflet's useMap() hook, so they call methods on this ref instead.
  const mapRef = useRef<L.Map | null>(null);

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
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-white/55">
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

  // Bus marker sits at the next stop. Hidden if the trip is finished.
  const busPoint =
    !finished && splitAt > 0 && splitAt <= points.length
      ? points[Math.min(splitAt, points.length - 1)]
      : !finished && splitAt === 0 && points.length > 0
        ? points[0]
        : null;
  const busPos: [number, number] | null = busPoint ? [busPoint.lat, busPoint.lon] : null;
  const center: [number, number] = busPos ?? [points[0].lat, points[0].lon];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-glow">
      <div className="h-[420px]">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <ViewController
            points={points}
            nextStopIndex={nextStopIndex}
            viewMode={viewMode}
            focusedStopKey={focusedStopKey ?? null}
          />

          {passed.length >= 2 && (
            <Polyline
              positions={passed}
              pathOptions={{ color: "#475569", weight: 3, opacity: 0.55, dashArray: "1 6" }}
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
            const isNext = !finished && p.idx === splitAt;
            return (
              <CircleMarker
                key={p.stop.key}
                center={[p.lat, p.lon]}
                radius={isNext ? 6 : isPassed ? 3 : 5}
                pathOptions={{
                  color: "#0f172a",
                  fillColor: isNext ? "#22d3ee" : isPassed ? "#64748b" : "#94a3b8",
                  fillOpacity: isPassed ? 0.55 : 1,
                  weight: 1.5,
                  className: "stop-circle",
                }}
                eventHandlers={{
                  mouseover: (e) => e.target.setStyle({ weight: 3 }),
                  mouseout: (e) => e.target.setStyle({ weight: 1.5 }),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1} className="stop-tooltip">
                  <div className="px-2 py-1">
                    <div className="text-[12px] font-semibold text-white">
                      {p.stop.stop?.name}
                    </div>
                    <div className="text-[10px] text-white/55">
                      #{p.stop.stop?.number}
                      {isNext && <span className="ml-1 text-cyan-300">· Next stop</span>}
                      {isPassed && <span className="ml-1 text-white/40">· Passed</span>}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {busPos && (
            <>
              <Marker position={busPos} icon={nextStopRingIcon} interactive={false} />
              <Marker position={busPos} icon={busIcon} zIndexOffset={1000} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Floating control panel */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-900/80 backdrop-blur-md shadow-glow-lg">
          <button
            onClick={() => setViewMode("bus")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition ${
              viewMode === "bus"
                ? "bg-gradient-to-r from-indigo-500/35 to-cyan-500/35 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
            aria-pressed={viewMode === "bus"}
            aria-label="Follow bus view"
          >
            <Bus className="h-3.5 w-3.5" />
            Follow bus
          </button>
          <div className="h-px bg-white/[0.08]" />
          <button
            onClick={() => setViewMode("full")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition ${
              viewMode === "full"
                ? "bg-gradient-to-r from-indigo-500/35 to-cyan-500/35 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
            aria-pressed={viewMode === "full"}
            aria-label="Full route view"
          >
            <Route className="h-3.5 w-3.5" />
            Full route
          </button>
        </div>

        {busPos && (
          <button
            onClick={() =>
              mapRef.current?.flyTo(busPos, viewMode === "bus" ? 16 : 14, {
                animate: true,
                duration: 0.7,
              })
            }
            className="pointer-events-auto flex items-center gap-2 self-end rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur-md shadow-glow transition hover:bg-ink-800/80 hover:text-white"
            aria-label="Recenter on bus"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Recenter
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Imperative controller for the map camera.
 * Watches three inputs in priority order:
 *   1. focusedStopKey  — fly to the stop the user clicked in the list
 *   2. viewMode        — flyToBounds for either the bus window or the whole route
 *   3. nextStopIndex   — when in "bus" mode and the bus advances, recenter
 */
function ViewController({
  points,
  nextStopIndex,
  viewMode,
  focusedStopKey,
}: {
  points: { stop: ScheduledStopT; lat: number; lon: number; idx: number }[];
  nextStopIndex: number;
  viewMode: ViewMode;
  focusedStopKey: string | null;
}) {
  const map = useMap();

  // 1. Click-to-fly from the stop list.
  useEffect(() => {
    if (!focusedStopKey) return;
    const target = points.find((p) => p.stop.key === focusedStopKey);
    if (!target) return;
    map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.9,
    });
  }, [focusedStopKey, points, map]);

  // 2 + 3. Re-fit when the view mode flips or when the bus advances.
  useEffect(() => {
    if (points.length === 0) return;

    const window =
      viewMode === "full"
        ? points
        : points.slice(
            Math.max(0, nextStopIndex - WINDOW_BEHIND),
            Math.min(points.length, nextStopIndex + WINDOW_AHEAD)
          );
    if (window.length === 0) return;

    const bounds = L.latLngBounds(window.map((p) => [p.lat, p.lon] as [number, number]));
    map.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: viewMode === "bus" ? 16 : 14,
      animate: true,
      duration: 0.9,
    });
    // We intentionally only run this when viewMode or nextStopIndex changes,
    // not on every points reference change (which would jitter on each refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, nextStopIndex]);

  return null;
}


