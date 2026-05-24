"use client";

import { useEffect, useMemo, useState } from "react";
import type { StopResponse, StopS } from "@/lib/transit/types";
import { StopCard } from "./StopCard";

interface Props {
  defaultLat: number;
  defaultLon: number;
  defaultDistance: number;
}

export function StopsList({ defaultLat, defaultLon, defaultDistance }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: defaultLat,
    lon: defaultLon,
  });
  const [usingMyLocation, setUsingMyLocation] = useState(false);
  const [stops, setStops] = useState<StopS[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/transit/stops?lat=${coords.lat}&lon=${coords.lon}&distance=${defaultDistance}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as StopResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const sorted = [...(data.stops ?? [])].sort(
          (a, b) => (a.distances?.direct ?? 0) - (b.distances?.direct ?? 0)
        );
        setStops(sorted);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Could not load stops.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lon, defaultDistance]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUsingMyLocation(true);
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => setError(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const filtered = useMemo(() => {
    if (!stops) return [];
    if (!search.trim()) return stops;
    const q = search.toLowerCase();
    return stops.filter((s) => (s.name ?? "").toLowerCase().includes(q));
  }, [stops, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stops by name…"
          className="flex-1 rounded-xl bg-white/15 px-4 py-3 text-white placeholder-white/60 outline-none ring-1 ring-white/20 focus:ring-white/40"
        />
        <button
          onClick={useMyLocation}
          className="rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25"
        >
          {usingMyLocation ? "Using your location" : "Use my location"}
        </button>
      </div>

      <div className="text-xs text-white/60">
        Centered at {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)} · radius{" "}
        {defaultDistance} m
      </div>

      {loading && <div className="text-white/70">Loading nearby stops…</div>}
      {error && (
        <div className="rounded-xl bg-red-500/20 p-4 text-red-100 ring-1 ring-red-400/40">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-white/70">No stops found nearby.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => (
          <StopCard key={s.key} stop={s} />
        ))}
      </div>
    </div>
  );
}
