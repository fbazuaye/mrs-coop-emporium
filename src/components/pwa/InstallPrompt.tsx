import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { BrandButton } from "@/components/brand/BrandButton";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mrs-coop-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-4 shadow-premium md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-burgundy text-primary-foreground shadow-burgundy">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">Install MRS Coop Store</div>
          <p className="text-xs text-muted-foreground">
            Add the app to your device for faster access and a premium experience.
          </p>
          <div className="mt-3 flex gap-2">
            <BrandButton size="sm" onClick={install}>
              Install
            </BrandButton>
            <BrandButton size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </BrandButton>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
