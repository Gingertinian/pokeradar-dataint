import type { Coordinate } from "./geography";

/** Coarse map cells limit requests while exploring; these are not device coordinates. */
export function weatherCell([longitude, latitude]: Coordinate): Coordinate {
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return [Number(wrapped.toFixed(1)), Number(Math.max(-90, Math.min(90, latitude)).toFixed(1))];
}

export function parseWeatherLocation(params: URLSearchParams): Coordinate | null | undefined {
  const latitude = params.get("lat"),
    longitude = params.get("lon");
  if (latitude === null && longitude === null) return undefined;
  if (latitude === null || longitude === null || !latitude.trim() || !longitude.trim()) return null;
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!numeric.test(latitude.trim()) || !numeric.test(longitude.trim())) return null;
  const lat = Number(latitude),
    lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return null;
  return weatherCell([lon, lat]);
}
