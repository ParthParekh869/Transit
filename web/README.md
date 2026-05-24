# Transit — Web

Web companion to the Transit iOS app. Live Winnipeg Transit schedules, with
a built-in seam for adding an AI assistant later.

## Quick start

```bash
cd web
cp .env.local.example .env.local   # the example file already has a public API key
npm install
npm run dev
```

Open http://localhost:3000.

## What you get

- **Home (`/`)** — Nearby stops with route badges. Uses the browser's
  geolocation if you allow it, otherwise falls back to the default Winnipeg
  coords from `.env.local`.
- **Stop schedule (`/stops/{number}`)** — Live arrivals grouped by route,
  with LATE / ERLY / ON TIME indicators and "DUE / N min / h:mm a" ETAs.
  Auto-refreshes every 30 seconds.
- **Trip detail (`/trips/{tripKey}`)** — Map of every stop on the bus's
  route (Leaflet + CARTO dark tiles) plus a list of upcoming stops with
  times.

## How it's structured

```
web/
├── app/
│   ├── page.tsx                 Home — nearby stops
│   ├── stops/[number]/page.tsx  Stop schedule
│   ├── trips/[key]/page.tsx     Live trip + map
│   ├── about/page.tsx
│   └── api/transit/             Server-side proxy. Hides the API key,
│       ├── stops/route.ts       fixes CORS, and gives the AI tools layer
│       ├── routes/route.ts      a stable HTTP surface to call too.
│       ├── stops/[number]/schedule/route.ts
│       └── trips/[key]/route.ts
├── components/                  StopsList, StopCard, RouteBadge,
│                                ScheduleBoard, TripView, TripMap, NavBar
├── lib/transit/
│   ├── types.ts                 TS mirror of the Swift Codable models
│   ├── client.ts                One function per upstream endpoint
│   └── format.ts                Date / distance / punctuality helpers
└── ai/
    ├── tools.ts                 The four endpoints, exposed as JSON-schema
    │                            tools for OpenAI / Anthropic / Vercel AI SDK
    └── README.md                How to plug in an LLM in ~20 lines
```

## Adding the AI assistant later

See [`ai/README.md`](./ai/README.md). The short version: each Transit API
operation is already a function-calling tool, so wiring up a chat endpoint is
a ~20-line addition that doesn't touch any of the existing UI.

## Notes

- All times from the Winnipeg Transit API are naive ISO timestamps in
  Winnipeg local time. `lib/transit/format.ts` parses them as local time.
  When deploying outside Canada/Central, pin the server timezone to
  `America/Winnipeg` or convert explicitly.
- The API key lives in `WINNIPEG_TRANSIT_API_KEY` and is only ever read
  server-side. The browser only ever sees `/api/transit/*` URLs.
