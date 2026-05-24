import Link from "next/link";

export function NavBar() {
  return (
    <nav className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-wide text-white">
          TRANSIT
        </Link>
        <div className="flex gap-4 text-sm text-white/70">
          <Link href="/" className="hover:text-white">
            Stops
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
