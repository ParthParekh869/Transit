import Link from "next/link";
import { Bus } from "lucide-react";

export function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-glow transition group-hover:scale-105">
            <Bus className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          TRANSIT
        </Link>
        <div className="flex gap-1 text-sm text-white/60">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
          >
            Stops
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
