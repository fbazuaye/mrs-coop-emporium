import type { ReactNode } from "react";
import { PremiumCard } from "./PremiumCard";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <PremiumCard className="flex flex-col items-center gap-4 py-16 text-center">
      {icon && (
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-burgundy text-primary-foreground shadow-burgundy">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </PremiumCard>
  );
}
