"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Book } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
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
    <nav className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-2xl flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs",
                item.active ? "text-foreground" : "text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
