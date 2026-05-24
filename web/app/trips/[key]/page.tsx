import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TripView } from "@/components/TripView";
import { NavBar } from "@/components/NavBar";

interface Props {
  params: { key: string };
}

export default function TripPage({ params }: Props) {
  const tripKey = Number(params.key);
  if (!Number.isFinite(tripKey)) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-white">Invalid trip key.</main>;
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <TripView tripKey={tripKey} />
      </main>
    </>
  );
}
