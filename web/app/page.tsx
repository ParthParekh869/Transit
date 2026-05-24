import { StopsList } from "@/components/StopsList";
import { NavBar } from "@/components/NavBar";

export default function HomePage() {
  // Coordinates are NOT defaulted — geolocation is requested in the client.
  const radius = Number(process.env.DEFAULT_RADIUS_M ?? 1000);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-300/80">
            Winnipeg Transit · Live
          </div>
          <h1 className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            Stops Near You
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Tap a stop to see live arrivals, then a bus to follow it stop-by-stop on the map.
          </p>
        </header>

        <StopsList radius={radius} />
      </main>
    </>
  );
}
