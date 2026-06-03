import { TopNav } from "./TopNav";

export function AppShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <TopNav />
      <div
        className={
          wide
            ? "flex-1 w-full mx-auto max-w-2xl lg:max-w-none px-5 sm:px-8 lg:px-0 pt-8 lg:pt-0 pb-8 lg:pb-0 lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden"
            : "flex-1 w-full mx-auto max-w-2xl px-5 sm:px-8 pt-8 pb-8"
        }
      >
        {children}
      </div>
    </>
  );
}
