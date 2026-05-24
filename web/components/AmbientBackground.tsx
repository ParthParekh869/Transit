/**
 * Drifting color blobs that animate slowly behind the entire app.
 * Pure CSS, no JS. Honors prefers-reduced-motion via globals.css.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950"
    >
      {/* Subtle radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(6,182,212,0.10),_transparent_55%)]" />

      {/* Drifting blobs */}
      <div className="absolute -top-[20%] -left-[10%] h-[60vh] w-[60vh] rounded-full bg-indigo-500/30 blur-[120px] animate-drift-1" />
      <div className="absolute top-[20%] -right-[15%] h-[55vh] w-[55vh] rounded-full bg-cyan-500/20 blur-[120px] animate-drift-2" />
      <div className="absolute -bottom-[15%] left-[25%] h-[55vh] w-[55vh] rounded-full bg-fuchsia-500/15 blur-[140px] animate-drift-3" />

      {/* Grain (just a light dot pattern via SVG noise) */}
      <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:3px_3px]" />
    </div>
  );
}
