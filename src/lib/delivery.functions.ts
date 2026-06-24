import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Store hub origin (Lagos). Keep aligned with track route HUB.
export const STORE_ORIGIN = { lat: 6.435, lng: 3.435 };
export const DELIVERY_BASE_FEE = 500;
export const DELIVERY_RATE_PER_KM = 500;

const QuoteInput = z.object({
  address: z.string().min(3),
});

export type DeliveryQuote = {
  destination: { lat: number; lng: number };
  formattedAddress: string;
  distanceMeters: number;
  durationSeconds: number;
  fee: number;
};

export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((d) => QuoteInput.parse(d))
  .handler(async ({ data }): Promise<DeliveryQuote> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) throw new Error("Google Maps connector not configured");

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
    };

    // 1) Geocode the address
    const geoUrl = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(data.address)}&region=ng`;
    const geoRes = await fetch(geoUrl, { headers });
    if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`);
    const geo = (await geoRes.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (geo.status !== "OK" || !geo.results?.[0]) {
      throw new Error("Address not found");
    }
    const top = geo.results[0];
    const destination = top.geometry.location;

    // 2) Compute route from store
    const routeRes = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: STORE_ORIGIN.lat, longitude: STORE_ORIGIN.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      },
    );
    if (!routeRes.ok) {
      const body = await routeRes.text();
      throw new Error(`Routes API ${routeRes.status}: ${body}`);
    }
    const routeJson = (await routeRes.json()) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>;
    };
    const r = routeJson.routes?.[0];
    if (!r) throw new Error("No route returned");
    const distanceMeters = r.distanceMeters ?? 0;
    const durationSeconds = Number((r.duration ?? "0s").replace(/s$/, "")) || 0;

    const km = distanceMeters / 1000;
    const fee = Math.round(DELIVERY_BASE_FEE + km * DELIVERY_RATE_PER_KM);

    return {
      destination,
      formattedAddress: top.formatted_address,
      distanceMeters,
      durationSeconds,
      fee,
    };
  });
