import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

type Props = {
  rider?: LatLng | null;
  destination?: LatLng | null;
  origin?: LatLng | null;
  path?: LatLng[];
  breadcrumbs?: LatLng[];
  className?: string;
};

declare global {
  interface Window {
    google?: any;
    __initGmaps?: () => void;
    __gmapsLoading?: Promise<void>;
  }
}

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsLoading) return window.__gmapsLoading;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps browser key missing"));

  window.__gmapsLoading = new Promise<void>((resolve, reject) => {
    window.__initGmaps = () => resolve();
    const s = document.createElement("script");
    const channel = TRACKING_ID ? `&channel=${encodeURIComponent(TRACKING_ID)}` : "";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initGmaps${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
  return window.__gmapsLoading;
}

export function DeliveryMap({
  rider,
  destination,
  origin,
  path,
  breadcrumbs,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const breadRef = useRef<any>(null);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const g = window.google;
        const center = rider ?? destination ?? origin ?? { lat: 6.5244, lng: 3.3792 };
        mapRef.current = new g.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers & path
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!g || !map) return;

    const setMarker = (
      ref: React.MutableRefObject<any>,
      pos: LatLng | null | undefined,
      color: string,
      label?: string,
    ) => {
      if (!pos) {
        if (ref.current) {
          ref.current.setMap(null);
          ref.current = null;
        }
        return;
      }
      if (!ref.current) {
        ref.current = new g.maps.Marker({
          position: pos,
          map,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          label: label
            ? { text: label, color: "#fff", fontSize: "11px", fontWeight: "700" }
            : undefined,
        });
      } else {
        ref.current.setPosition(pos);
      }
    };

    setMarker(originMarkerRef, origin ?? null, "#0f766e", "S");
    setMarker(destMarkerRef, destination ?? null, "#7A0E14", "D");
    setMarker(riderMarkerRef, rider ?? null, "#f59e0b", "R");

    // Main route polyline
    if (path && path.length > 1) {
      if (!polyRef.current) {
        polyRef.current = new g.maps.Polyline({
          map,
          path,
          strokeColor: "#7A0E14",
          strokeOpacity: 0.85,
          strokeWeight: 5,
        });
      } else {
        polyRef.current.setPath(path);
      }
    } else if (polyRef.current) {
      polyRef.current.setMap(null);
      polyRef.current = null;
    }

    // Rider breadcrumbs
    if (breadcrumbs && breadcrumbs.length > 1) {
      if (!breadRef.current) {
        breadRef.current = new g.maps.Polyline({
          map,
          path: breadcrumbs,
          strokeColor: "#f59e0b",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 }, offset: "0", repeat: "12px" }],
        });
      } else {
        breadRef.current.setPath(breadcrumbs);
      }
    } else if (breadRef.current) {
      breadRef.current.setMap(null);
      breadRef.current = null;
    }

    // Fit bounds to whatever we have
    const pts: LatLng[] = [
      ...(rider ? [rider] : []),
      ...(destination ? [destination] : []),
      ...(origin ? [origin] : []),
      ...(path ?? []),
    ];
    if (pts.length >= 2) {
      const bounds = new g.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 64);
    } else if (pts.length === 1) {
      map.panTo(pts[0]);
    }
  }, [rider, destination, origin, path, breadcrumbs]);

  if (!BROWSER_KEY) {
    return (
      <div className={className ?? "h-[420px] w-full rounded-2xl bg-muted grid place-items-center"}>
        <p className="text-sm text-muted-foreground">
          Google Maps is not configured for this project.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[420px] w-full overflow-hidden rounded-2xl border border-border"}
    />
  );
}
