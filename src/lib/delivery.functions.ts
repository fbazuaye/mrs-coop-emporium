import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Store hub origin: MRS Oil Nigeria PLC Warehouse, No. 227 Ikorodu/Ibadan Expressway,
// Estate Bus Stop, Alapere, Ketu, Lagos (beside MRS filling station, Alapere).
export const STORE_ORIGIN = { lat: 6.5894, lng: 3.3897 };
export const STORE_ADDRESS =
  "MRS Oil Nigeria PLC Warehouse, 227 Ikorodu/Ibadan Expressway, Estate Bus Stop, Alapere, Ketu, Lagos";
export const DELIVERY_BASE_FEE = 500;
export const DELIVERY_RATE_PER_KM = 500;

export type DeliveryQuote = {
  destination: { lat: number; lng: number };
  formattedAddress: string;
  distanceMeters: number;
  durationSeconds: number;
  fee: number;
};

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) throw new Error("Google Maps connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
  };
}

async function routeFromStore(destination: { lat: number; lng: number }) {
  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: STORE_ORIGIN.lat, longitude: STORE_ORIGIN.lng } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Routes API ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const r = json.routes?.[0];
  if (!r) throw new Error("No route returned");
  return {
    distanceMeters: r.distanceMeters ?? 0,
    durationSeconds: Number((r.duration ?? "0s").replace(/s$/, "")) || 0,
  };
}

function feeFor(distanceMeters: number) {
  const km = distanceMeters / 1000;
  return Math.round(DELIVERY_BASE_FEE + km * DELIVERY_RATE_PER_KM);
}

// Address-based quote (fallback when no Place selection is available).
export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ address: z.string().min(3) }).parse(d))
  .handler(async ({ data }): Promise<DeliveryQuote> => {
    const geoUrl = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(data.address)}&region=ng`;
    const geoRes = await fetch(geoUrl, { headers: gatewayHeaders() });
    if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`);
    const geo = (await geoRes.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (geo.status !== "OK" || !geo.results?.[0]) throw new Error("Address not found");
    const top = geo.results[0];
    const destination = top.geometry.location;
    const route = await routeFromStore(destination);
    return {
      destination,
      formattedAddress: top.formatted_address,
      ...route,
      fee: feeFor(route.distanceMeters),
    };
  });

// Coords-based quote (preferred — used after Places Autocomplete selection).
export const quoteDeliveryByCoords = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        formattedAddress: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DeliveryQuote> => {
    const destination = { lat: data.lat, lng: data.lng };
    const route = await routeFromStore(destination);
    return {
      destination,
      formattedAddress: data.formattedAddress,
      ...route,
      fee: feeFor(route.distanceMeters),
    };
  });

// Resolve a Place Autocomplete selection to coordinates via Places API (New).
export const getPlaceDetails = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ placeId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const url = `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(data.placeId)}`;
    const res = await fetch(url, {
      headers: {
        ...gatewayHeaders(),
        "X-Goog-FieldMask": "id,location,formattedAddress",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Place Details ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      location?: { latitude: number; longitude: number };
      formattedAddress?: string;
    };
    if (!json.location) throw new Error("Place has no location");
    return {
      lat: json.location.latitude,
      lng: json.location.longitude,
      formattedAddress: json.formattedAddress ?? "",
    };
  });
