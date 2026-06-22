import { useEffect, useState } from "react";
import logoAsset from "@/assets/mrs-logo.png.asset.json";

const SHOWN_KEY = "mrs-splash-shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Show on every fresh app load (per tab session).
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    setVisible(true);
    sessionStorage.setItem(SHOWN_KEY, "1");
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-[#7A0E14] via-[#5a0a10] to-[#3d070b] px-6 py-12 text-white animate-in fade-in duration-300"
      role="status"
      aria-label="Loading MRS Staff Coop Store"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="grid h-28 w-28 place-items-center rounded-3xl bg-white/10 p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur">
          <img src={logoAsset.url} alt="MRS Staff Coop Store" className="h-full w-full object-contain" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          MRS STAFF COOP STORE
        </h1>
        <p className="mt-2 text-sm font-medium text-white/85 sm:text-base">
          Shop Smarter. Live Better.
        </p>
        <div className="mt-8 flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/90 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/90 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/90" />
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/70">
        Designed and Powered By LiveGig Ltd
      </p>
    </div>
  );
}
