import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "compact" | "stacked";
};

export function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Mark />
        <span className="font-semibold tracking-tight text-foreground">MRS Coop</span>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
        <Mark size="lg" />
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">MRS</div>
          <div className="font-semibold text-foreground">Staff Coop Store</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Mark />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          MRS
        </span>
        <span className="text-base font-semibold tracking-tight text-foreground">
          Staff Coop Store
        </span>
      </div>
    </div>
  );
}

function Mark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-xl bg-gradient-burgundy text-primary-foreground shadow-burgundy",
        size === "md" ? "h-9 w-9" : "h-14 w-14",
      )}
    >
      <span
        className={cn(
          "font-display font-bold tracking-tight",
          size === "md" ? "text-sm" : "text-xl",
        )}
      >
        M
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gradient-gold ring-2 ring-background" />
    </div>
  );
}
