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
import { Bus, Route, Crosshair, Star } from "lucide-react";
import type { ScheduledStopT, BadgeStyle } from "@/lib/transit/types";
import { bearing, lerpLatLon } from "@/lib/transit/format";

// Suppress Leaflet's default-icon URL lookup warning under bundlers.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

type ViewMode = "bus" | "full";

/** Number of stops on each side of the bus included in "Follow bus" mode. */
const WINDOW_BEHIND = 2;
const WINDOW_AHEAD = 4;
/** Place a direction arrow every Nth stop along the upcoming polyline. */
const ARROW_EVERY = 5;

interface Props {
  scheduledStops: ScheduledStopT[];
  /** Index of the next stop the bus will reach. Stops before this are "passed". */
  nextStopIndex: number;
  /** Whether the trip has already ended. Hides the bus marker. */
  finished: boolean;
  /** Stop key of a stop the user clicked in the list — map will fly to it. */
  focusedStopKey?: string | null;
  /** Stop number of the user's "stop of interest" (where they came from) — gets a star. */
  interestStopNumber?: number | null;
  /** Route's badge style from the API — used to color the polyline + bus marker. */
  routeBadgeStyle?: BadgeStyle | null;
  /** The route number/label to show inside the bus marker (e.g. "60", "F6"). */
  routeLabel?: string | null;
}

/** Build a route-themed bus marker on the fly. */
function makeBusIcon(label: string | null, badge: BadgeStyle | null): L.DivIcon {
  const bg = badge?.backgroundColor ?? "#22d3ee";
  const fg = badge?.color ?? "#0f172a";
  const safeLabel = (label ?? "BUS").slice(0, 4);
  return L.divIcon({
    className: "transit-bus-marker",
    html: `
      <div class="bus-marker-pill" style="background:${bg};color:${fg};">
        <span class="bus-marker-pill__inner">${escapeHtml(safeLabel)}</span>
      </div>`,
    iconSize: [54, 30],
    iconAnchor: [27, 15],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

const nextStopRingIcon = L.divIcon({
  className: "transit-next-stop-ring",
  html: `<div class="next-stop-ring"></div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});

const interestStopIcon = L.divIcon({
  className: "transit-interest-stop",
  html: `
    <div class="interest-marker">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fff" stroke-width="1.4">
        <polygon points="12,2 15.1,8.6 22,9.6 17,14.5 18.2,21.5 12,18.1 5.8,21.5 7,14.5 2,9.6 8.9,8.6"/>
      </svg>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** Direction-of-travel chevron, rotated to match bearing. */
function makeArrowIcon(deg: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "transit-arrow",
    html: `
      <div class="route-arrow" style="transform:rotate(${deg}deg); color:${color};">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2 L20 18 L12 14 L4 18 Z" />
        </svg>
      </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function TripMap({
  scheduledStops,
  nextStopIndex,
  finished,
  focusedStopKey,
  interestStopNumber,
  routeBadgeStyle,
  routeLabel,
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

  // Route theming colors with sensible fallbacks.
  const routeColor = routeBadgeStyle?.backgroundColor ?? "#22d3ee";
  const passedColor = "#475569"; // slate-600 — desaturated regardless of route color

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

  // Direction-of-travel arrows along the upcoming polyline. Place one at the
  // midpoint between every Nth pair of stops, rotated to match bearing.
  const arrows = useMemo(() => {
    const out: { pos: [number, number]; deg: number }[] = [];
    const upcomingPts = points.slice(Math.max(0, splitAt - 1));
    for (let i = 0; i < upcomingPts.length - 1; i += ARROW_EVERY) {
      const a = upcomingPts[i];
      const b = upcomingPts[i + 1];
      if (!a || !b) continue;
      const mid = lerpLatLon(a, b, 0.5);
      out.push({ pos: [mid.lat, mid.lon], deg: bearing(a, b) });
    }
    return out;
  }, [points, splitAt]);

  const busIcon = useMemo(
    () => makeBusIcon(routeLabel ?? null, routeBadgeStyle ?? null),
    [routeLabel, routeBadgeStyle]
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-glow">
      <div className="h-[460px]">
        <MapContainer center={center} zoom={14} scrollWheelZoom ref={mapRef}>
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

          {/* Passed segment — desaturated and dashed */}
          {passed.length >= 2 && (
            <Polyline
              positions={passed}
              pathOptions={{
                color: passedColor,
                weight: 3,
                opacity: 0.55,
                dashArray: "1 6",
              }}
            />
          )}
          {/* Upcoming segment — themed in the route's badge color */}
          {upcoming.length >= 2 && (
            <Polyline
              positions={upcoming}
              pathOptions={{ color: routeColor, weight: 4, opacity: 0.95 }}
            />
          )}

          {/* Direction arrows along the upcoming route */}
          {arrows.map((a, i) => (
            <Marker
              key={`arrow-${i}`}
              position={a.pos}
              icon={makeArrowIcon(a.deg, routeColor)}
              interactive={false}
            />
          ))}

          {points.map((p) => {
            const isPassed = p.idx < splitAt;
            const isNext = !finished && p.idx === splitAt;
            const isInterest =
              interestStopNumber != null && p.stop.stop?.number === interestStopNumber;
            return (
              <CircleMarker
                key={p.stop.key}
                center={[p.lat, p.lon]}
                radius={isInterest ? 7 : isNext ? 6 : isPassed ? 3 : 5}
                pathOptions={{
                  color: isInterest ? "#fbbf24" : "#0f172a",
                  fillColor: isInterest
                    ? "#fbbf24"
                    : isNext
                      ? routeColor
                      : isPassed
                        ? "#64748b"
                        : "#94a3b8",
                  fillOpacity: isPassed ? 0.55 : 1,
                  weight: isInterest ? 2 : 1.5,
                  className: "stop-circle",
                }}
                eventHandlers={{
                  mouseover: (e) => e.target.setStyle({ weight: 3 }),
                  mouseout: (e) => e.target.setStyle({ weight: isInterest ? 2 : 1.5 }),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1} className="stop-tooltip">
                  <div className="px-2 py-1">
                    <div className="text-[12px] font-semibold text-white">
                      {p.stop.stop?.name}
                    </div>
                    <div className="text-[10px] text-white/55">
                      #{p.stop.stop?.number}
                      {isInterest && <span className="ml-1 text-amber-300">· Your stop</span>}
                      {isNext && <span className="ml-1 text-cyan-300">· Next stop</span>}
                      {isPassed && <span className="ml-1 text-white/40">· Passed</span>}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Star marker overlay for the user's stop of interest */}
          {interestStopNumber != null &&
            (() => {
              const interestPt = points.find(
                (p) => p.stop.stop?.number === interestStopNumber
              );
              if (!interestPt) return null;
              return (
                <Marker
                  position={[interestPt.lat, interestPt.lon]}
                  icon={interestStopIcon}
                  interactive={false}
                />
              );
            })()}

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

        {interestStopNumber != null && (
          <button
            onClick={() => {
              const target = points.find((p) => p.stop.stop?.number === interestStopNumber);
              if (target && mapRef.current) {
                mapRef.current.flyTo([target.lat, target.lon], 16, { animate: true, duration: 0.8 });
              }
            }}
            className="pointer-events-auto flex items-center gap-2 self-end rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100 backdrop-blur-md shadow-glow transition hover:bg-amber-500/25"
            aria-label="Center on your stop"
          >
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            Your stop
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
