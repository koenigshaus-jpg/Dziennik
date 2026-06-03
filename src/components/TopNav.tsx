import Link from "next/link";

export function TopNav() {
  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-between px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Link
        href="/"
        className="text-base font-display font-semibold tracking-tight hover:opacity-80"
      >
        Dziennik
      </Link>
    </header>
  );
}
