import { StopsList } from "@/components/StopsList";
import { NavBar } from "@/components/NavBar";

export default function HomePage() {
  const defaultLat = Number(process.env.DEFAULT_LAT ?? 49.809438);
  const defaultLon = Number(process.env.DEFAULT_LON ?? -97.130437);
  const defaultDistance = Number(process.env.DEFAULT_RADIUS_M ?? 1000);

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

        <StopsList
          defaultLat={defaultLat}
          defaultLon={defaultLon}
          defaultDistance={defaultDistance}
        />
      </main>
    </>
  );
}
