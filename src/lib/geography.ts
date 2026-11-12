import { z } from "zod";

export type Coordinate = [number, number];
export type MapBounds = [number, number, number, number];

export function boundsFingerprint(bounds: MapBounds): string {
  return bounds.map((value) => value.toFixed(5)).join(",");
}

const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const ringSchema = z.array(coordinateSchema).min(4);
const polygonSchema = z.array(ringSchema).min(1);

export const areaSchema = z.object({
  name: z.string(),
  center: coordinateSchema,
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  geometry: z.discriminatedUnion("type", [
    z.object({ type: z.literal("Polygon"), coordinates: polygonSchema }),
    z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(polygonSchema).min(1) }),
    z.object({ type: z.literal("LineString"), coordinates: z.array(coordinateSchema).min(2) }),
    z.object({
      type: z.literal("MultiLineString"),
      coordinates: z.array(z.array(coordinateSchema).min(2)).min(1),
    }),
  ]),
  source: z.object({
    provider: z.string(),
    osmType: z.string(),
    osmId: z.number(),
    url: z.string().url(),
  }),
});

export type ExplorationArea = z.infer<typeof areaSchema>;

function insideRing([longitude, latitude]: Coordinate, ring: Coordinate[]): boolean {
  let inside = false;
  for (let i = 0, previous = ring.length - 1; i < ring.length; previous = i, i += 1) {
    const a = ring[i];
    const b = ring[previous];
    if (!a || !b) continue;
    const intersects =
      a[1] > latitude !== b[1] > latitude &&
      longitude < ((b[0] - a[0]) * (latitude - a[1])) / (b[1] - a[1]) + a[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInArea(point: Coordinate, area: ExplorationArea): boolean {
  if (area.geometry.type === "LineString" || area.geometry.type === "MultiLineString") {
    const lines =
      area.geometry.type === "LineString" ? [area.geometry.coordinates] : area.geometry.coordinates;
    return lines.some((line) =>
      line.some((start, index) => {
        const end = line[index + 1];
        if (!end) return false;
        const scale = Math.cos((point[1] * Math.PI) / 180);
        const dx = (end[0] - start[0]) * scale;
        const dy = end[1] - start[1];
        const length = dx * dx + dy * dy;
        const t = length
          ? Math.max(
              0,
              Math.min(
                1,
                ((point[0] - start[0]) * scale * dx + (point[1] - start[1]) * dy) / length,
              ),
            )
          : 0;
        return (
          distanceInMeters(point, [
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
          ]) < 10
        );
      }),
    );
  }
  const polygons =
    area.geometry.type === "Polygon" ? [area.geometry.coordinates] : area.geometry.coordinates;
  return polygons.some(
    ([outline, ...holes]) =>
      outline !== undefined &&
      insideRing(point, outline) &&
      !holes.some((hole) => insideRing(point, hole)),
  );
}

export function distanceInMeters(a: Coordinate, b: Coordinate): number {
  const radians = Math.PI / 180;
  const north = (b[1] - a[1]) * radians;
  const east = (b[0] - a[0]) * radians * Math.cos(((a[1] + b[1]) / 2) * radians);
  return Math.hypot(north, east) * 6371000;
}

export function seededRandom(seed: string): () => number {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function placeEncounters(area: ExplorationArea, ids: number[], seed: string): Coordinate[] {
  if (area.geometry.type === "LineString" || area.geometry.type === "MultiLineString") {
    const lines =
      area.geometry.type === "LineString" ? [area.geometry.coordinates] : area.geometry.coordinates;
    const segments = lines.flatMap((line) =>
      line.flatMap((start, index) => {
        const end = line[index + 1];
        return end ? [{ start, end, length: distanceInMeters(start, end) }] : [];
      }),
    );
    const total = segments.reduce((sum, segment) => sum + segment.length, 0);
    const random = seededRandom(seed);
    return ids.map((_, index) => {
      let along = total * ((index + 0.2 + random() * 0.6) / ids.length);
      for (const segment of segments) {
        if (along <= segment.length) {
          const t = segment.length ? along / segment.length : 0;
          return [
            segment.start[0] + (segment.end[0] - segment.start[0]) * t,
            segment.start[1] + (segment.end[1] - segment.start[1]) * t,
          ] as Coordinate;
        }
        along -= segment.length;
      }
      return [...area.center] as Coordinate;
    });
  }
  const [west, south, east, north] = area.bounds;
  const width = distanceInMeters([west, south], [east, south]);
  const height = distanceInMeters([west, south], [west, north]);
  const spacing = (Math.min(width, height) / Math.sqrt(ids.length)) * 0.3;
  const positions: Coordinate[] = [];

  for (const id of ids) {
    const random = seededRandom(`${seed}:${id}`);
    let position: Coordinate | undefined;
    for (let attempt = 0; attempt < 4096; attempt += 1) {
      const candidate: Coordinate = [
        west + random() * (east - west),
        south + random() * (north - south),
      ];
      if (
        isPointInArea(candidate, area) &&
        positions.every((other) => distanceInMeters(candidate, other) >= spacing)
      ) {
        position = candidate;
        break;
      }
    }
    if (!position) throw new Error(`Cannot place encounter ${id} inside ${area.name}`);
    positions.push(position);
  }
  return positions;
}

export function isWithinBounds(
  [longitude, latitude]: Coordinate,
  [west, south, east, north]: MapBounds,
): boolean {
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

type Located = { key: string; coordinates: Coordinate };
export type EncounterCluster<T> = { key: string; coordinates: Coordinate; items: T[] };

function worldPixel([longitude, latitude]: Coordinate, zoom: number): Coordinate {
  const size = 512 * 2 ** zoom;
  const sine = Math.sin((latitude * Math.PI) / 180);
  return [
    ((longitude + 180) / 360) * size,
    (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size,
  ];
}

export function clusterEncounters<T extends Located>(
  items: T[],
  zoom: number,
  radius = 36,
): EncounterCluster<T>[] {
  const clusters: EncounterCluster<T>[] = [];
  for (const item of items) {
    const point = worldPixel(item.coordinates, zoom);
    const target = clusters.find((cluster) => {
      const center = worldPixel(cluster.coordinates, zoom);
      return Math.hypot(point[0] - center[0], point[1] - center[1]) < radius;
    });
    if (target) {
      target.items.push(item);
      target.coordinates = [
        target.items.reduce((sum, entry) => sum + entry.coordinates[0], 0) / target.items.length,
        target.items.reduce((sum, entry) => sum + entry.coordinates[1], 0) / target.items.length,
      ];
      target.key = target.items.map((entry) => entry.key).join("|");
    } else {
      clusters.push({ key: item.key, coordinates: [...item.coordinates], items: [item] });
    }
  }
  return clusters;
}
