import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { EntryForm } from "@/components/entry/EntryForm";
import { formatWithWeekdayPL } from "@/lib/dates";
import { APP_VERSION } from "@/lib/version";

export default function HomePage() {
  const today = new Date();
  return (
    <>
      <TopNav />
      <div className="fixed bottom-16 right-4 lg:bottom-3 z-20 text-[10px] uppercase tracking-[0.18em] text-muted/70 font-mono pointer-events-none select-none">
        v{APP_VERSION}
      </div>
      <main className="flex-1 flex flex-col justify-center w-full mx-auto max-w-2xl lg:max-w-5xl px-5 sm:px-8 py-10">
        <div className="text-center mb-6 lg:mb-14 -mt-16">
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
