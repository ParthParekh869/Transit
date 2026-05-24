/**
 * Date and time helpers for Winnipeg Transit API responses.
 *
 * The API is inconsistent about its time format. Within a single response
 * you can see both:
 *   - Full ISO local timestamps:  "2026-05-24T14:35:00"   (queryTime)
 *   - Bare wall-clock times:      "13:33:00"              (most stops)
 *
 * Bare times are implicitly "today, in Winnipeg local time". We therefore
 * carry a `referenceDate` (the response's queryTime, parsed) through every
 * comparison so bare times resolve to the correct calendar day. An overnight
 * heuristic flips a bare time to "tomorrow" if it lands more than 6 hours
 * before the reference, which handles late-evening trips that wrap midnight.
 */

const ISO_FULL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const BARE_TIME = /^\d{1,2}:\d{2}:\d{2}$/;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Parse a transit timestamp. Accepts:
 *  - "yyyy-MM-ddTHH:mm:ss" (treated as local time)
 *  - "HH:mm:ss"            (combined with referenceDate's calendar day)
 * Returns null if neither pattern matches or the value is empty.
 */
export function parseTransitDate(
  iso?: string | null,
  referenceDate?: Date | null
): Date | null {
  if (!iso) return null;

  if (ISO_FULL.test(iso)) {
    const d = new Date(iso); // local time
    return isNaN(d.getTime()) ? null : d;
  }

  if (BARE_TIME.test(iso)) {
    const ref = referenceDate ?? new Date();
    const [h, m, s] = iso.split(":").map(Number);
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), h, m, s);
    // Overnight heuristic: if the bare time is more than 6 hours behind the
    // reference, the stop is tomorrow (a late-night trip wrapping midnight).
    if (d.getTime() < ref.getTime() - SIX_HOURS_MS) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // Last-ditch fallback — let JS try.
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Minutes between two transit timestamps. Right - left, rounded.
 *  Uses `left` as the reference for parsing bare-time `right` values. */
export function minutesBetween(left?: string | null, right?: string | null): number {
  const a = parseTransitDate(left);
  const b = parseTransitDate(right, a);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** "DUE" / "3 min" / "4:25 PM" — same logic as the iOS ContentViewAdv. */
export function arrivalLabel(now?: string | null, estimated?: string | null): string {
  const ref = parseTransitDate(now);
  const est = parseTransitDate(estimated, ref);
  if (!ref || !est) return estimated ?? "";
  const diff = Math.round((est.getTime() - ref.getTime()) / 60000);
  if (diff <= 0) return "DUE";
  if (diff < 15) return `${diff} min`;
  return est.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Formats a transit timestamp as "h:mm a" (e.g. "4:25 PM"). */
export function formatClock(iso?: string | null, referenceDate?: Date | null): string {
  const d = parseTransitDate(iso, referenceDate);
  if (!d) return iso ?? "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Late/early/on-time classification for the schedule badge. */
export type Punctuality = "late" | "early" | "on-time";

export function punctuality(scheduled?: string, estimated?: string): Punctuality {
  const s = parseTransitDate(scheduled);
  const e = parseTransitDate(estimated, s);
  if (!s || !e) return "on-time";
  const delta = Math.round((e.getTime() - s.getTime()) / 60000);
  if (delta > 0) return "late";
  if (delta < 0) return "early";
  return "on-time";
}

export function formatDistance(meters?: number | null): string {
  if (meters == null) return "";
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km away` : `${km.toFixed(1)} km away`;
  }
  return `${Math.round(meters)} m away`;
}

/** Haversine distance in meters between two lat/lon points. */
export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Estimate where the bus currently is along its trip based on stop timings.
 *
 * The Winnipeg Transit API doesn't expose a real-time bus position (lat/lon),
 * but each scheduled stop carries an `estimated` arrival/departure time.
 * Comparing those against the response's `queryTime` lets us infer:
 *   - which stops the bus has already passed
 *   - which stop is "next"
 *   - and therefore where on the polyline the bus marker should sit.
 *
 * Returns `nextIndex`:
 *   - 0 if the trip hasn't started yet
 *   - stops.length if the trip is finished
 *   - otherwise the index of the next stop the bus will reach
 */
export function inferTripProgress(
  stops: Array<{ times?: { arrival?: { estimated?: string }; departure?: { estimated?: string } } }>,
  queryTime?: string | null
): { nextIndex: number; finished: boolean } {
  const ref = parseTransitDate(queryTime);
  if (!ref || stops.length === 0) {
    return { nextIndex: 0, finished: false };
  }
  const refMs = ref.getTime();
  for (let i = 0; i < stops.length; i++) {
    const est =
      stops[i].times?.arrival?.estimated ?? stops[i].times?.departure?.estimated;
    const t = parseTransitDate(est, ref)?.getTime();
    if (t != null && t > refMs) return { nextIndex: i, finished: false };
  }
  return { nextIndex: stops.length, finished: true };
}

/**
 * Pull the route number out of a variant key like "60-1-D" → "60".
 * Used to render a route pill on the live tracker when only a variant key
 * is available (the trips endpoint doesn't return a full Route object).
 */
export function routeNumberFromVariantKey(variantKey?: string | null): string | null {
  if (!variantKey) return null;
  const head = variantKey.split("-")[0];
  return head || null;
}
