"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { TripSchedule } from "@/lib/transit/types";
import { formatClock, arrivalLabel } from "@/lib/transit/format";

// Leaflet touches `window`, so the map must be client-only.
const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

interface Props {
  tripKey: number;
}

export function TripView({ tripKey }: Props) {
  const [data, setData] = useState<TripSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/transit/trips/${tripKey}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as TripSchedule;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Could not load trip.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripKey]);

  if (loading) return <div className="text-white/70">Loading trip…</div>;
  if (error)
    return (
      <div className="rounded-xl bg-red-500/20 p-4 text-red-100 ring-1 ring-red-400/40">
        {error}
      </div>
    );

  const stops = data?.trip?.scheduledStops ?? [];
  const queryTime = data?.queryTime;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold">Trip #{tripKey}</h2>
        <div className="mt-1 text-sm text-white/70">
          {data?.trip?.scheduleType ?? "—"} · {stops.length} stops
          {queryTime ? <> · Updated {formatClock(queryTime)}</> : null}
        </div>
      </header>

      <TripMap scheduledStops={stops} />

      <div className="flex flex-col gap-2">
        {stops.map((s) => (
          <div
            key={s.key}
            className="glass flex items-center justify-between rounded-xl p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{s.stop?.name}</div>
              <div className="text-xs text-white/60">
                #{s.stop?.number}
                {s.stop?.centre?.geographic && (
                  <>
                    {" "}· {s.stop.centre.geographic.latitude?.toFixed(4)},{" "}
                    {s.stop.centre.geographic.longitude?.toFixed(4)}
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-300">
                {arrivalLabel(queryTime, s.times?.departure?.estimated)}
              </div>
              <div className="text-xs text-white/60">
                sched {formatClock(s.times?.departure?.scheduled)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
