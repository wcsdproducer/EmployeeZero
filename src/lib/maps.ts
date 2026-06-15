/**
 * Google Maps Platform Integration
 * Covers: Places, Directions, Distance Matrix, Geocoding
 */

const BASE = "https://maps.googleapis.com/maps/api";

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not configured.");
  return k;
}

// ── Place Search (Text Search) ─────────────────────────────────────────────

export async function lookupPlace(query: string, location?: string) {
  const params = new URLSearchParams({
    query: location ? `${query} near ${location}` : query,
    key: key(),
    fields: "name,formatted_address,rating,user_ratings_total,opening_hours,formatted_phone_number,website,geometry,place_id,types",
  });
  const res = await fetch(`${BASE}/place/textsearch/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API error: ${data.status} — ${data.error_message || ""}`);
  }
  const results = (data.results || []).slice(0, 5).map((p: any) => ({
    name: p.name,
    address: p.formatted_address,
    rating: p.rating,
    reviewCount: p.user_ratings_total,
    phone: p.formatted_phone_number,
    website: p.website,
    placeId: p.place_id,
    types: p.types?.slice(0, 3),
    isOpen: p.opening_hours?.open_now,
    location: p.geometry?.location,
  }));
  return { query, results, count: results.length };
}

// ── Nearby Places Search ───────────────────────────────────────────────────

export async function findNearbyPlaces(address: string, type: string, radiusMeters = 1500) {
  // First geocode the address to get lat/lng
  const geo = await geocodeAddress(address);
  if (!geo.location) throw new Error(`Could not geocode address: ${address}`);
  const { lat, lng } = geo.location;

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radiusMeters),
    type: type.toLowerCase().replace(/ /g, "_"),
    key: key(),
  });
  const res = await fetch(`${BASE}/place/nearbysearch/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Nearby Places error: ${data.status} — ${data.error_message || ""}`);
  }
  const results = (data.results || []).slice(0, 8).map((p: any) => ({
    name: p.name,
    address: p.vicinity,
    rating: p.rating,
    reviewCount: p.user_ratings_total,
    placeId: p.place_id,
    isOpen: p.opening_hours?.open_now,
    types: p.types?.slice(0, 3),
    location: p.geometry?.location,
  }));
  return { address, type, radiusMeters, results, count: results.length };
}

// ── Directions ─────────────────────────────────────────────────────────────

export async function getDirections(
  origin: string,
  destination: string,
  mode: "driving" | "walking" | "transit" | "bicycling" = "driving"
) {
  const params = new URLSearchParams({
    origin,
    destination,
    mode,
    key: key(),
    units: "imperial",
  });
  const res = await fetch(`${BASE}/directions/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(`Directions API error: ${data.status} — ${data.error_message || ""}`);
  }
  const route = data.routes[0];
  const leg = route.legs[0];
  const steps = leg.steps.slice(0, 15).map((s: any) => ({
    instruction: s.html_instructions.replace(/<[^>]+>/g, ""),
    distance: s.distance.text,
    duration: s.duration.text,
  }));
  return {
    origin: leg.start_address,
    destination: leg.end_address,
    mode,
    totalDistance: leg.distance.text,
    totalDuration: leg.duration.text,
    steps,
    mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`,
  };
}

// ── Distance Matrix ────────────────────────────────────────────────────────

export async function calculateDistance(
  origins: string[],
  destinations: string[],
  mode: "driving" | "walking" | "transit" | "bicycling" = "driving"
) {
  const params = new URLSearchParams({
    origins: origins.join("|"),
    destinations: destinations.join("|"),
    mode,
    key: key(),
    units: "imperial",
  });
  const res = await fetch(`${BASE}/distancematrix/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(`Distance Matrix error: ${data.status} — ${data.error_message || ""}`);
  }
  const matrix = data.rows.map((row: any, oi: number) => ({
    origin: data.origin_addresses[oi],
    destinations: row.elements.map((el: any, di: number) => ({
      destination: data.destination_addresses[di],
      distance: el.distance?.text || "N/A",
      duration: el.duration?.text || "N/A",
      status: el.status,
    })),
  }));
  return { mode, matrix };
}

// ── Geocoding ──────────────────────────────────────────────────────────────

export async function geocodeAddress(address: string) {
  const params = new URLSearchParams({ address, key: key() });
  const res = await fetch(`${BASE}/geocode/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Geocoding error: ${data.status} — ${data.error_message || ""}`);
  }
  const result = data.results?.[0];
  if (!result) return { address, location: null, formattedAddress: null };
  return {
    address,
    formattedAddress: result.formatted_address,
    location: result.geometry.location,
    placeId: result.place_id,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.formatted_address)}`,
  };
}

// ── Reverse Geocoding ──────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number) {
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: key() });
  const res = await fetch(`${BASE}/geocode/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(`Reverse Geocode error: ${data.status}`);
  }
  const result = data.results?.[0];
  return {
    lat, lng,
    formattedAddress: result?.formatted_address || "Unknown",
    placeId: result?.place_id,
  };
}
