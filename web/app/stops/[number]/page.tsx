import Link from "next/link";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { NavBar } from "@/components/NavBar";

interface Props {
  params: { number: string };
}

export default function StopPage({ params }: Props) {
  const stopNumber = Number(params.number);
  if (!Number.isFinite(stopNumber)) {
    return <div className="p-8 text-white">Invalid stop number.</div>;
  }
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-white/70 hover:text-white">
          ← Back to nearby stops
        </Link>
        <ScheduleBoard stopNumber={stopNumber} />
      </main>
    </>
  );
}
