import { describe, expect, it } from "vitest";
import { createSightings, getRegion, REGIONS } from "@/lib/regions";
import { clusterEncounters, isPointInArea, isWithinBounds } from "@/lib/geography";

describe("Geografía de la expedición", () => {
  it.each(REGIONS)("ubica $name dentro del parque y conserva las posiciones", (region) => {
    const sightings = createSightings(region);
    expect(sightings).toHaveLength(region.species.length);
    expect(new Set(sightings.map((entry) => entry.key)).size).toBe(sightings.length);
    expect(new Set(sightings.map((entry) => entry.coordinates.join(","))).size).toBe(
      sightings.length,
    );
    for (const sighting of sightings) {
      expect(isWithinBounds(sighting.coordinates, region.area.bounds)).toBe(true);
      expect(isPointInArea(sighting.coordinates, region.area)).toBe(true);
      expect(sighting.pokemon.id).toBeGreaterThan(0);
    }
    expect(createSightings(region)).toEqual(sightings);
  });

  it("excluye un punto del mar situado fuera del Parque San Martín", () => {
    expect(isPointInArea([-57.523, -38.024], getRegion("costa").area)).toBe(false);
  });

  it("agrupa al alejar la cámara y conserva cada avistamiento una sola vez", () => {
    const sightings = createSightings(getRegion("costa"));
    const far = clusterEncounters(sightings, 11);
    const close = clusterEncounters(sightings, 20);
    expect(far.length).toBeLessThan(close.length);
    expect(
      far
        .flatMap((cluster) => cluster.items)
        .map((entry) => entry.key)
        .sort(),
    ).toEqual(sightings.map((entry) => entry.key).sort());
    expect(close.flatMap((cluster) => cluster.items)).toHaveLength(sightings.length);
  });
});
