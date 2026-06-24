// Lightweight loader for Google Maps JS API (async) — singleton promise.
// Relies on @types/google.maps for the ambient `google` global namespace.
type GoogleNS = typeof google;

let loaderPromise: Promise<GoogleNS> | null = null;

declare global {
  interface Window {
    __lovableGmapsInit?: () => void;
  }
}

export function loadGoogleMaps(): Promise<GoogleNS> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;
  if (!key) {
    return Promise.reject(new Error("Google Maps browser key missing"));
  }

  loaderPromise = new Promise<GoogleNS>((resolve, reject) => {
    window.__lovableGmapsInit = () => resolve(window.google);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__lovableGmapsInit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}
