"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Wifi, Bike, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import type { StopScheduleResponse } from "@/lib/transit/types";
import { arrivalLabel, formatClock, punctuality } from "@/lib/transit/format";
import { RouteBadge } from "./RouteBadge";
import { ScheduleRowSkeleton } from "./Skeleton";

interface Props {
  stopNumber: number;
}

export function ScheduleBoard({ stopNumber }: Props) {
  const [data, setData] = useState<StopScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = (initial: boolean) => {
      if (!initial) setRefreshing(true);
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
          if (!cancelled) {
            if (initial) setLoading(false);
            else setRefreshing(false);
          }
        });
    };
    load(true);
    const id = setInterval(() => load(false), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stopNumber]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-2/3 rounded skeleton" />
          <div className="mx-auto h-4 w-1/3 rounded skeleton" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ScheduleRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
        <AlertTriangle className="h-5 w-5 flex-none" />
        <div>{error}</div>
      </div>
    );
  }

  const stop = data?.stopSchedule?.stop;
  const routeSchedules = data?.stopSchedule?.routeSchedules ?? [];
  const queryTime = data?.queryTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6"
    >
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
          Stop Schedule
        </div>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white">
          {stop?.name ?? "Stop"}
        </h1>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-sm text-white/55">
          <span className="font-mono tabular-nums">#{stop?.number}</span>
          {queryTime && (
            <>
              <span className="text-white/25">·</span>
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {formatClock(queryTime)}</span>
              {refreshing && (
                <motion.span
                  className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </>
          )}
        </div>
      </header>

      {routeSchedules.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-white/55">
          No upcoming buses.
        </div>
      )}

      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {routeSchedules.map((rs) => {
          const r = rs.route;
          const label = String(r?.badgeLabel ?? r?.key ?? "");
          const accent = r?.badgeStyle?.backgroundColor ?? "#6366f1";
          return (
            <motion.section
              key={label}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <RouteBadge label={label} style={r?.badgeStyle} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {r?.name}
                  </div>
                  <div className="text-xs text-white/45">
                    {(rs.scheduledStops ?? []).length} upcoming
                  </div>
                </div>
              </div>

              <motion.div
                className="space-y-2"
                variants={{
                  show: { transition: { staggerChildren: 0.04 } },
                  hidden: {},
                }}
              >
                <AnimatePresence mode="popLayout">
                  {(rs.scheduledStops ?? []).map((ss) => {
                    const sched = ss.times?.departure?.scheduled;
                    const est = ss.times?.departure?.estimated;
                    const status = punctuality(sched, est);
                    const eta = arrivalLabel(queryTime, est);
                    return (
                      <motion.div
                        key={ss.tripKey ?? ss.key}
                        layout
                        variants={{
                          hidden: { opacity: 0, x: -8 },
                          show: { opacity: 1, x: 0 },
                        }}
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      >
                        <Link
                          href={ss.tripKey ? `/trips/${ss.tripKey}?fromStop=${stopNumber}` : "#"}
                          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                        >
                          {/* Route accent stripe */}
                          <span
                            className="absolute inset-y-0 left-0 w-[3px] rounded-r"
                            style={{ background: accent }}
                          />

                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                            <Bus className="h-4.5 w-4.5 text-white/80" strokeWidth={2} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-white">
                              {ss.variant?.name ?? "Unknown destination"}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                              {ss.bus?.key != null && (
                                <span className="font-mono tabular-nums">Bus #{ss.bus.key}</span>
                              )}
                              {ss.bus?.bikeRack === "true" && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Bike className="h-3 w-3" /> rack
                                </span>
                              )}
                              {ss.bus?.wifi === "true" && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Wifi className="h-3 w-3" /> WiFi
                                </span>
                              )}
                              {sched && (
                                <span className="text-white/35">sched {formatClock(sched)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <PunctualityBadge status={status} />
                            <div className="min-w-[52px] text-right text-lg font-bold tabular-nums text-cyan-300">
                              {eta}
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function PunctualityBadge({ status }: { status: "late" | "early" | "on-time" }) {
  const map: Record<typeof status, { label: string; className: string }> = {
    late: { label: "LATE", className: "bg-rose-500/20 text-rose-200 ring-rose-400/30" },
    early: { label: "EARLY", className: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30" },
    "on-time": { label: "ON TIME", className: "bg-white/10 text-white/70 ring-white/15" },
  };
  const { label, className } = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ring-1 ${className}`}
    >
      {label}
    </span>
  );
}
