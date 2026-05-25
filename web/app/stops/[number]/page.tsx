import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { NavBar } from "@/components/NavBar";

interface Props {
  // Next 15 made dynamic-route params async; Next 14 accepts a Promise here too.
  params: Promise<{ number: string }>;
}

export default async function StopPage({ params }: Props) {
  const { number } = await params;
  const stopNumber = Number(number);
  if (!Number.isFinite(stopNumber)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-white">Invalid stop number.</main>
    );
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Nearby stops
        </Link>
        <ScheduleBoard stopNumber={stopNumber} />
      </main>
    </>
  );
}
