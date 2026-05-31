import { BottomNav } from "@/components/BottomNav";
import { EntryForm } from "@/components/entry/EntryForm";
import { formatWithWeekdayPL } from "@/lib/dates";

export default function HomePage() {
  const today = new Date();
  return (
    <>
      <main className="flex-1 flex flex-col justify-center w-full mx-auto max-w-2xl px-5 sm:px-8 py-10">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {formatWithWeekdayPL(today)}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-3">
            Co dziś było ważne?
          </h1>
        </div>
        <EntryForm mode="create" />
      </main>
      <BottomNav />
    </>
  );
}
