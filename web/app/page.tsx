import { StopsList } from "@/components/StopsList";
import { NavBar } from "@/components/NavBar";

export default function HomePage() {
  // No coordinate defaults — the user is prompted for geolocation upfront.
  // Only the search radius is configurable server-side.
  const radius = Number(process.env.DEFAULT_RADIUS_M ?? 1000);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Stops Near You</h1>
          <p className="mt-2 text-sm text-white/70">
            Live Winnipeg Transit schedules. Tap a stop to see upcoming buses.
          </p>
        </header>

        <StopsList radius={radius} />
      </main>
    </>
  );
}
