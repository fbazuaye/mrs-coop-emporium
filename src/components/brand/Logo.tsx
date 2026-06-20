import { cn } from "@/lib/utils";
import logoAsset from "@/assets/mrs-logo.png.asset.json";

type LogoProps = {
  className?: string;
  variant?: "default" | "compact" | "stacked";
};

export function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <img
          src={logoAsset.url}
          alt="MRS"
          className="h-8 w-auto object-contain"
          width={64}
          height={32}
        />
        <span className="font-semibold tracking-tight text-foreground">MRS Coop</span>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
        <img
          src={logoAsset.url}
          alt="MRS"
          className="h-12 w-auto object-contain"
          width={96}
          height={48}
        />
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">MRS</div>
          <div className="font-semibold text-foreground">Staff Coop Store</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoAsset.url}
        alt="MRS"
        className="h-9 w-auto object-contain"
        width={72}
        height={36}
      />
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
