"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StopScheduleResponse } from "@/lib/transit/types";
import { arrivalLabel, formatClock, punctuality } from "@/lib/transit/format";
import { RouteBadge } from "./RouteBadge";

interface Props {
  stopNumber: number;
}

export function ScheduleBoard({ stopNumber }: Props) {
  const [data, setData] = useState<StopScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setLoading(data === null);
      fetch(`/api/transit/stops/${stopNumber}/schedule`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as StopScheduleResponse;
        })
        .then((d) => {
          if (!cancelled) {
            setData(d);
            setError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message ?? "Could not load schedule.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    // Poll every 30 seconds — same cadence the iOS app re-fetches on appear.
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopNumber]);

  if (loading && !data) {
    return <div className="text-white/70">Fetching schedule…</div>;
  }
  if (error) {
    return (
      <div className="rounded-xl bg-red-500/20 p-4 text-red-100 ring-1 ring-red-400/40">
        {error}
      </div>
    );
  }
  if (!data?.stopSchedule) {
    return <div className="text-white/70">No schedule data.</div>;
  }

  const stop = data.stopSchedule.stop;
  const routeSchedules = data.stopSchedule.routeSchedules ?? [];
  const queryTime = data.queryTime;

  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <h2 className="text-2xl font-bold">{stop?.name ?? "Stop"}</h2>
        <div className="mt-1 text-sm text-white/70">
          #{stop?.number}
          {queryTime ? <> · Updated {formatClock(queryTime)}</> : null}
        </div>
      </header>

      {routeSchedules.length === 0 && (
        <div className="text-white/70">No upcoming buses.</div>
      )}

      {routeSchedules.map((rs) => {
        const r = rs.route;
        const label = String(r?.badgeLabel ?? r?.key ?? "");
        return (
          <section key={label} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <RouteBadge label={label} style={r?.badgeStyle} />
              <span className="text-base font-medium text-white/90">{r?.name}</span>
            </div>

            <div className="flex flex-col gap-2">
              {(rs.scheduledStops ?? []).map((ss) => {
                const sched = ss.times?.departure?.scheduled;
                const est = ss.times?.departure?.estimated;
                const status = punctuality(sched, est);
                const eta = arrivalLabel(queryTime, est);
                return (
                  <Link
                    key={ss.tripKey ?? ss.key}
                    href={ss.tripKey ? `/trips/${ss.tripKey}` : "#"}
                    className="glass flex items-center justify-between rounded-2xl p-4 transition hover:bg-white/15"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {ss.variant?.name ?? "Unknown destination"}
                      </div>
                      {ss.bus?.key != null && (
                        <div className="mt-0.5 text-xs text-white/60">
                          Bus #{ss.bus.key}
                          {ss.bus.bikeRack === "true" && " · bike rack"}
                          {ss.bus.wifi === "true" && " · WiFi"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <PunctualityBadge status={status} />
                      <span className="text-lg font-bold text-blue-300">{eta}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PunctualityBadge({ status }: { status: "late" | "early" | "on-time" }) {
  const map: Record<typeof status, { label: string; className: string }> = {
    late: { label: "LATE", className: "bg-red-500/25 text-red-200" },
    early: { label: "ERLY", className: "bg-green-500/25 text-green-200" },
    "on-time": { label: "ON TIME", className: "bg-white/20 text-white/80" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${className}`}>
      {label}
    </span>
  );
}
