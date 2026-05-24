"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ScheduledStopT } from "@/lib/transit/types";

// Fix Leaflet's default marker icons under bundlers (we don't use them, but
// suppresses the console warning).
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

interface Props {
  scheduledStops: ScheduledStopT[];
}

export default function TripMap({ scheduledStops }: Props) {
  const points = useMemo(
    () =>
      scheduledStops
        .map((s) => {
          const lat = s.stop?.centre?.geographic?.latitude;
          const lon = s.stop?.centre?.geographic?.longitude;
          return lat != null && lon != null ? { stop: s, lat, lon } : null;
        })
        .filter((x): x is { stop: ScheduledStopT; lat: number; lon: number } => x !== null),
    [scheduledStops]
  );

  if (points.length === 0) {
    return <div className="text-white/70">No coordinates to plot.</div>;
  }

  const center: [number, number] = [points[0].lat, points[0].lon];
  const polyline: [number, number][] = points.map((p) => [p.lat, p.lon]);

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl ring-1 ring-white/20">
      <MapContainer center={center} zoom={13} scrollWheelZoom>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds points={polyline} />
        <Polyline positions={polyline} pathOptions={{ color: "#ef4444", weight: 4 }} />
        {points.map((p) => (
          <CircleMarker
            key={p.stop.key}
            center={[p.lat, p.lon]}
            radius={6}
            pathOptions={{ color: "#ffffff", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.stop.stop?.name}</div>
                <div className="text-xs text-gray-500">#{p.stop.stop?.number}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
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
