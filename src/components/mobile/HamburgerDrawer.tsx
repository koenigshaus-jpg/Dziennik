"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Settings, LogOut, Loader2 } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HamburgerDrawer({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("logout failed", e);
    } finally {
      onOpenChange(false);
      // Hard nav zamiast router.push — gwarantuje że RSC/cache po stronie
      // serwera nie odda starej, autoryzowanej zawartości.
      window.location.href = "/login";
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw]",
            "bg-background border-l border-border shadow-2xl",
            "flex flex-col",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
          )}
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <DialogPrimitive.Title className="text-base font-semibold">
              Dziennik
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
              aria-label="Zamknij menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Menu nawigacji aplikacji
          </DialogPrimitive.Description>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-4">
            <nav>
              <ul className="flex flex-col gap-1">
                <li>
                  <Link
                    href="/ustawienia"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 px-3 h-11 rounded-md text-sm hover:bg-foreground/5"
                  >
                    <Settings className="h-4 w-4" />
                    Ustawienia
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-md text-sm hover:bg-foreground/5 disabled:opacity-70"
                  >
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? "Wylogowuję…" : "Wyloguj"}
                  </button>
                </li>
              </ul>
            </nav>
            <div className="px-1">
              <ThemeSwitcher embedded />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
