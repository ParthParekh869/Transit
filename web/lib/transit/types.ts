/**
 * TypeScript mirror of the Swift Codable models in /Transit/Models/.
 * The Winnipeg Transit API returns these shapes when called with
 * ?json-camel-case=true (which our server proxy always adds).
 *
 * Keep field names and optionality in sync with the Swift structs so
 * the iOS app and the website can share assumptions about the API.
 */

// --- Shared ----------------------------------------------------------------

/** Some Route fields come back as either a string OR an int.
 *  We always normalize to string in the proxy layer. */
export type StringOrInt = string;

export interface Geographics {
  latitude?: number;
  longitude?: number;
}

export interface Utm {
  zone?: string;
  x?: number;
  y?: number;
}

export interface Centre {
  utm?: Utm;
  geographic?: Geographics;
}

export interface Street {
  key?: number;
  name?: string;
  type?: string;
}

export interface ClassNames {
  className: string[];
}

export interface BadgeStyle {
  classNames?: ClassNames;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
}

export interface TimeDetail {
  scheduled?: string; // "yyyy-MM-dd'T'HH:mm:ss" — local Winnipeg time
  estimated?: string;
}

export interface Times {
  arrival?: TimeDetail;
  departure?: TimeDetail;
}

export interface Variant {
  key: string;
  name: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface Bus {
  key?: number;
  bikeRack?: string; // "true" / "false"
  wifi?: string;
}

export interface Stop {
  key?: number;
  name?: string;
  number?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  direction?: string;
  side?: string;
  street?: Street;
  crossStreet?: Street;
  centre?: Centre;
}

// --- Stops finder (GET /v4/stops.json?lat&lon&distance) -------------------

export interface Distances {
  direct?: number;
}

export interface StopS extends Stop {
  distances?: Distances;
}

export interface StopResponse {
  stops?: StopS[];
  queryTime?: string;
}

// --- Routes for stop (GET /v4/routes.json?stop=N) -------------------------

export interface VariantT {
  key?: string;
}

export interface RoutesR {
  key?: StringOrInt;
  number?: StringOrInt;
  name?: string;
  customerType?: string;
  coverage?: string;
  badgeLabel?: StringOrInt;
  badgeStyle?: BadgeStyle;
  variants?: VariantT[];
}

export interface RoutesResponse {
  routes?: RoutesR[];
  queryTime: string;
}

// --- Stop schedule (GET /v4/stops/{n}/schedule.json) ----------------------

export interface Route {
  key?: StringOrInt;
  number?: StringOrInt;
  name?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  customerType?: string;
  coverage?: string;
  badgeLabel?: StringOrInt;
  badgeStyle?: BadgeStyle;
}

export interface ScheduleStop {
  key?: string;
  tripKey?: number;
  cancelled?: string;
  times?: Times;
  variant?: Variant;
  bus?: Bus;
}

export interface RouteSchedule {
  route?: Route;
  scheduledStops?: ScheduleStop[];
}

export interface StopSchedule {
  stop?: Stop;
  routeSchedules?: RouteSchedule[];
}

export interface StopScheduleResponse {
  stopSchedule?: StopSchedule;
  queryTime?: string;
}

// --- Trip detail (GET /v4/trips/{key}.json) -------------------------------

export interface ScheduledStopT {
  key?: string;
  stop?: Stop;
  cancelled?: string;
  times?: Times;
}

export interface Trip {
  key?: number;
  previousTripKey?: number;
  variant?: VariantT;
  effectiveFrom?: string;
  effectiveTo?: string;
  scheduleType?: string;
  scheduledStops?: ScheduledStopT[];
}

export interface TripSchedule {
  trip?: Trip;
  queryTime?: string;
}
