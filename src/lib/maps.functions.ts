import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RouteInput = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
  travelMode: z.enum(["DRIVE", "TWO_WHEELER", "BICYCLE", "WALK"]).optional(),
});

export type RouteResult = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
};

export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator((d) => RouteInput.parse(d))
  .handler(async ({ data }): Promise<RouteResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) throw new Error("Google Maps connector not configured");

    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: data.origin } },
          destination: { location: { latLng: data.destination } },
          travelMode: data.travelMode ?? "TWO_WHEELER",
          routingPreference: "TRAFFIC_AWARE",
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Routes API ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      routes?: Array<{
        polyline?: { encodedPolyline?: string };
        distanceMeters?: number;
        duration?: string;
      }>;
    };
    const r = json.routes?.[0];
    if (!r?.polyline?.encodedPolyline) throw new Error("No route returned");
    const durStr = r.duration ?? "0s";
    const durationSeconds = Number(durStr.replace(/s$/, "")) || 0;
    return {
      polyline: r.polyline.encodedPolyline,
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds,
    };
  });
