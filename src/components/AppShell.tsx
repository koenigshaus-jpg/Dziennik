import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-1 w-full mx-auto max-w-2xl px-5 sm:px-8 pt-8 pb-8">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
