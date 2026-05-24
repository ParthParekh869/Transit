/**
 * Date and time helpers for Winnipeg Transit API responses.
 *
 * The API returns naive ISO timestamps "yyyy-MM-dd'T'HH:mm:ss" with no
 * timezone. They are *Winnipeg local time*. We deliberately treat them as
 * local time on the server's clock; for a deployment outside Winnipeg you
 * would parse them as America/Winnipeg explicitly.
 */

export function parseTransitDate(iso?: string | null): Date | null {
  if (!iso) return null;
  // `new Date("2025-11-12T14:35:00")` interprets as local time, which is
  // what we want when the server runs in Winnipeg's timezone or when only
  // relative comparisons (estimated vs scheduled) are needed.
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Minutes between two ISO timestamps. Right - left, rounded. */
export function minutesBetween(left?: string | null, right?: string | null): number {
  const a = parseTransitDate(left);
  const b = parseTransitDate(right);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** "DUE" / "3 min" / "4:25 PM" — same logic as the iOS ContentViewAdv. */
export function arrivalLabel(now?: string | null, estimated?: string | null): string {
  const diff = minutesBetween(now, estimated);
  if (diff <= 0) return "DUE";
  if (diff < 15) return `${diff} min`;
  return formatClock(estimated);
}

/** Formats an ISO string as "h:mm a" (e.g. "4:25 PM"). */
export function formatClock(iso?: string | null): string {
  const d = parseTransitDate(iso);
  if (!d) return iso ?? "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Late/early/on-time classification for the badge. */
export type Punctuality = "late" | "early" | "on-time";

export function punctuality(scheduled?: string, estimated?: string): Punctuality {
  const delta = minutesBetween(scheduled, estimated);
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
