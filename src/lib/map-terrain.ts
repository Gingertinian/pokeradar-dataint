import type { Map as MapLibreMap } from "maplibre-gl";
import { DESTINATIONS, type Destination, type Habitat } from "./destinations";
import {
  distanceInMeters,
  seededRandom,
  placeEncounters,
  isWithinBounds,
  type Coordinate,
} from "./geography";

export type TerrainSample = { coordinates: Coordinate; habitat: Habitat; cellId?: string };
export function terrainFingerprint(terrain: TerrainSample[] | undefined): string {
  if (!terrain) return "pending";
  if (!terrain.length) return "empty";
  return terrain
    .map(
      (point) =>
        `${point.cellId ?? point.coordinates.map((value) => value.toFixed(5)).join(",")}:${point.habitat}`,
    )
    .sort()
    .join("|");
}
const layers = ["water", "building", "landcover", "landuse", "park"] as const;
const source = "habitat-surface";

export function referenceHabitat(coordinates: Coordinate, site: Destination): Habitat {
  if (isWithinBounds(coordinates, site.viewBounds)) return site.habitat;
  let nearest: Destination | undefined;
  let distance = 25000;
  for (const candidate of DESTINATIONS) {
    const next = distanceInMeters(coordinates, candidate.area.center);
    if (next < distance) {
      nearest = candidate;
      distance = next;
    }
  }
  return nearest?.habitat ?? "grassland";
}

export function terrainHabitat(
  features: { sourceLayer?: string; properties: Record<string, unknown> }[],
  fallback: Habitat,
): Habitat | null {
  if (features.some((f) => ["water", "waterway", "building"].includes(f.sourceLayer ?? "")))
    return null;
  const land = features.find((f) => f.sourceLayer === "landcover"),
    use = features.find((f) => f.sourceLayer === "landuse"),
    park = features.some((f) => f.sourceLayer === "park");
  const kind = String(land?.properties.class ?? ""),
    purpose = String(use?.properties.class ?? "");
  if (
    kind === "ice" ||
    (!park &&
      !land &&
      !["residential", "recreation_ground", "grass", "village_green", "pitch"].includes(purpose))
  )
    return null;
  return kind === "wood"
    ? "forest"
    : kind === "grass"
      ? "grassland"
      : kind === "sand"
        ? fallback === "coast"
          ? "coast"
          : "mountain"
        : purpose === "residential"
          ? "urban"
          : fallback;
}

export function addTerrainReference(map: MapLibreMap) {
  if (!map.getSource(source))
    map.addSource(source, { type: "vector", url: "https://tiles.openfreemap.org/planet" });
  for (const layer of layers)
    if (!map.getLayer(`surface-${layer}`))
      map.addLayer({
        id: `surface-${layer}`,
        type: "fill",
        source,
        "source-layer": layer,
        paint: { "fill-color": "#ffffff", "fill-opacity": 0.001 },
      });
  if (!map.getLayer("surface-waterway"))
    map.addLayer({
      id: "surface-waterway",
      type: "line",
      source,
      "source-layer": "waterway",
      paint: { "line-opacity": 0.001, "line-width": 10 },
    });
}

export function sampleVisibleTerrain(
  map: MapLibreMap,
  site: Destination,
): TerrainSample[] | undefined {
  if (map.getZoom() < 13 || !map.getSource(source) || !map.isSourceLoaded(source)) return undefined;
  const box = map.getContainer(),
    samples: TerrainSample[] = [];
  const ids = layers.map((layer) => `surface-${layer}`).filter((id) => map.getLayer(id));
  if (map.getLayer("surface-waterway")) ids.push("surface-waterway");
  const center = map.getCenter(),
    bounds = map.getBounds(),
    zoom = Math.floor(map.getZoom());
  const spacing = Math.max(35, Math.min(800, 800 / 2 ** (zoom - 13)));
  const latitudeStep = spacing / 111320;
  const latitudeBand = Math.round(center.lat);
  const longitudeStep = latitudeStep / Math.max(0.2, Math.cos((latitudeBand * Math.PI) / 180));
  const south = Math.floor(bounds.getSouth() / latitudeStep),
    north = Math.ceil(bounds.getNorth() / latitudeStep);
  const west = Math.floor(bounds.getWest() / longitudeStep),
    east = Math.ceil(bounds.getEast() / longitudeStep);
  for (let row = south; row <= north; row++)
    for (let column = west; column <= east; column++) {
      const cellId = `${latitudeBand}:${zoom}:${row}:${column}`;
      const random = seededRandom(`${site.id}:${cellId}`);
      const coordinates: Coordinate = [
        (column + 0.2 + random() * 0.6) * longitudeStep,
        (row + 0.2 + random() * 0.6) * latitudeStep,
      ];
      const point = map.project(coordinates);
      const x = point.x,
        y = point.y;
      if (x < 40 || x > box.clientWidth - 50 || y < 105 || y > box.clientHeight - 135) continue;
      const features = map.queryRenderedFeatures([x, y], { layers: ids });
      const habitat = terrainHabitat(features, referenceHabitat(coordinates, site));
      if (!habitat) continue;
      samples.push({ coordinates, habitat, cellId });
    }
  const area = site.area.bounds;
  const intersectsArea =
    bounds.getWest() <= area[2] &&
    bounds.getEast() >= area[0] &&
    bounds.getSouth() <= area[3] &&
    bounds.getNorth() >= area[1];
  if (!samples.length && intersectsArea) {
    const visible: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const candidates = placeEncounters(
      site.area,
      Array.from({ length: 12 }, (_, index) => index + 1),
      `${site.id}:verified-fallback`,
    );
    for (const [index, coordinates] of candidates.entries()) {
      if (!isWithinBounds(coordinates, visible)) continue;
      const point = map.project(coordinates);
      if (
        point.x < 40 ||
        point.x > box.clientWidth - 50 ||
        point.y < 105 ||
        point.y > box.clientHeight - 135
      )
        continue;
      const features = map.queryRenderedFeatures([point.x, point.y], { layers: ids });
      if (
        features.some((feature) =>
          ["water", "waterway", "building"].includes(feature.sourceLayer ?? ""),
        )
      )
        continue;
      samples.push({ coordinates, habitat: site.habitat, cellId: `fallback:${index}` });
    }
  }
  return samples;
}
