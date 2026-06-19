import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PremiumCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition",
        interactive && "hover:-translate-y-0.5 hover:shadow-premium",
        className,
      )}
    >
      {children}
    </div>
  );
}
