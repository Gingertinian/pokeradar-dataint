import { distanceInMeters, type Coordinate } from "./geography";

export type SharedCamera = { coordinates: Coordinate; zoom: number };

export function reachedDestination(
  actual: SharedCamera,
  expected: Coordinate,
  minZoom: number,
): boolean {
  const viewTolerance =
    (40075016 * Math.cos((expected[1] * Math.PI) / 180) * 0.5) / 2 ** actual.zoom;
  return (
    actual.zoom >= minZoom &&
    distanceInMeters(actual.coordinates, expected) < Math.max(5000, viewTolerance)
  );
}

export function parseSharedCamera(
  params: Record<string, string | string[] | undefined>,
): SharedCamera | null {
  const values = [params.lng, params.lat, params.zoom];
  if (values.some((value) => typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value)))
    return null;
  const [longitude, latitude, zoom] = values.map(Number);
  if (
    longitude === undefined ||
    latitude === undefined ||
    zoom === undefined ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -85 ||
    latitude > 85 ||
    zoom < 2.8 ||
    zoom > 19
  )
    return null;
  return { coordinates: [longitude, latitude], zoom };
}

export function writeSharedCamera(params: URLSearchParams, camera: SharedCamera) {
  params.set("lng", camera.coordinates[0].toFixed(5));
  params.set("lat", camera.coordinates[1].toFixed(5));
  params.set("zoom", camera.zoom.toFixed(2));
}
