import Link from "next/link";
import { TripView } from "@/components/TripView";
import { NavBar } from "@/components/NavBar";

interface Props {
  params: { key: string };
}

export default function TripPage({ params }: Props) {
  const tripKey = Number(params.key);
  if (!Number.isFinite(tripKey)) {
    return <div className="p-8 text-white">Invalid trip key.</div>;
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-white/70 hover:text-white">
          ← Back
        </Link>
        <TripView tripKey={tripKey} />
      </main>
    </>
  );
}
