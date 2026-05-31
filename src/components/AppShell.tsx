import { BottomNav } from "./BottomNav";
import { APP_VERSION } from "@/lib/version";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="absolute top-3 right-4 z-20 text-[10px] uppercase tracking-[0.18em] text-muted/70 font-mono pointer-events-none select-none">
        v{APP_VERSION}
      </div>
      <div className="flex-1 w-full mx-auto max-w-2xl px-5 sm:px-8 pt-8 pb-8">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
