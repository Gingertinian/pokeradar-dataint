import {
  createExpeditionSightings,
  type Destination,
  type ExpeditionSighting,
  type Habitat,
} from "./destinations";
import {
  distanceInMeters,
  isWithinBounds,
  seededRandom,
  worldPixel,
  type Coordinate,
  type MapBounds,
} from "./geography";
import type { TerrainSample } from "./map-terrain";
import type { Weather } from "./weather";

const LOCAL_HABITAT_LABELS: Record<Habitat, string> = {
  coast: "la costa",
  forest: "la vegetación arbolada",
  riverside: "la ribera",
  mountain: "el terreno abierto",
  grassland: "la vegetación abierta",
  glacier: "el entorno glaciar",
  urban: "el entorno urbano",
};
export type RadarView = {
  coordinates: Coordinate;
  bounds: MapBounds;
  zoom: number;
  terrain?: TerrainSample[];
};
export function radarTargets(
  entries: ExpeditionSighting[],
  origin: Coordinate,
  zoom: number,
  discovered: ReadonlySet<string> = new Set(),
) {
  const nearest = [...entries].sort((a, b) => {
    const discoveryPriority = Number(discovered.has(a.key)) - Number(discovered.has(b.key));
    return (
      discoveryPriority ||
      distanceInMeters(a.coordinates, origin) - distanceInMeters(b.coordinates, origin)
    );
  });
  const targets: ExpeditionSighting[] = [];
  const positions: Coordinate[] = [];
  for (const entry of nearest) {
    const point = worldPixel(entry.coordinates, zoom);
    if (positions.some((other) => Math.hypot(point[0] - other[0], point[1] - other[1]) < 64))
      continue;
    targets.push(entry);
    positions.push(point);
    if (targets.length === 3) break;
  }
  return targets;
}
export function viewSeed(view: RadarView | null): number {
  if (!view) return 0;
  return (
    Math.abs(
      Math.round(view.coordinates[0] * 20000) * 31 +
        Math.round(view.coordinates[1] * 20000) * 17 +
        Math.floor(view.zoom * 20) * 131,
    ) % 100000
  );
}
export function localSightings(
  site: Destination,
  view: RadarView | null,
  options: { day: string; round: number; weather?: Weather; pinnedId?: number | null },
): ExpeditionSighting[] {
  const result: ExpeditionSighting[] = [],
    ids = new Set<number>();
  if (view && view.terrain !== undefined) {
    const samples = view.terrain
      .map((point) => ({
        point,
        rank: seededRandom(
          `${site.id}:${options.day}:${options.round}:${point.cellId ?? point.coordinates.join(":")}`,
        )(),
      }))
      .sort((a, b) => a.rank - b.rank);
    const pools = new Map<string, ExpeditionSighting[]>();
    for (const { point } of samples) {
      if (!isWithinBounds(point.coordinates, view.bounds)) continue;
      let pool = pools.get(point.habitat);
      if (!pool) {
        pool = createExpeditionSightings(
          { ...site, habitat: point.habitat },
          { ...options, round: options.round + 1 },
        );
        pools.set(point.habitat, pool);
      }
      const random = seededRandom(
        `${site.id}:${options.day}:${options.round}:${point.cellId ?? point.coordinates.join(":")}:species`,
      );
      const start = Math.floor(random() * pool.length);
      const entry = [...pool.slice(start), ...pool.slice(0, start)].find(
        (item) => !ids.has(item.pokemon.id),
      );
      if (!entry) continue;
      ids.add(entry.pokemon.id);
      result.push({
        ...entry,
        coordinates: point.coordinates,
        habitat: point.habitat,
        terrainDerived: true,
        reason: entry.boosted
          ? entry.reason
          : `Afinidad con ${LOCAL_HABITAT_LABELS[point.habitat]}`,
      });
      if (result.length >= 12) break;
    }
    return result;
  }
  for (let pass = 0; pass < (view ? 12 : 1); pass++) {
    for (const entry of createExpeditionSightings(site, {
      ...options,
      round: options.round + viewSeed(view) + pass,
    })) {
      if (ids.has(entry.pokemon.id) || (view && !isWithinBounds(entry.coordinates, view.bounds)))
        continue;
      result.push(entry);
      ids.add(entry.pokemon.id);
      if (result.length >= 10) return result;
    }
  }
  return result;
}
