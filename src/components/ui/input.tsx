import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-md border border-border bg-transparent px-3 text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/30",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
