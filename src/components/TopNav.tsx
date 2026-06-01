"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Book } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Nowy", icon: PenLine, active: pathname === "/" },
    {
      href: "/historia",
      label: "Historia",
      icon: Book,
      active: pathname.startsWith("/historia") || pathname.startsWith("/wpis"),
    },
  ];

  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-end px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="flex items-stretch h-full -mb-px">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 h-full px-5 text-sm font-medium border-b-2 transition-colors",
                item.active
                  ? "text-foreground border-foreground"
                  : "text-muted border-transparent hover:text-foreground hover:border-foreground/30"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
