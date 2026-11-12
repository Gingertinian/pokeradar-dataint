import { describe, it, expect } from "vitest";
import { getDestination } from "./destinations";
import { isWithinBounds, isPointInArea } from "./geography";
import { localSightings, type RadarView } from "./local-radar";
describe("Radar de la vista actual", () => {
  it("no inventa apariciones cuando la cobertura disponible no encuentra suelo elegible", () => {
    const site = getDestination("san-martin")!;
    const view: RadarView = {
      coordinates: site.area.center,
      bounds: site.area.bounds,
      zoom: 16,
      terrain: [],
    };
    expect(localSightings(site, view, { day: "2026-11-12", round: 0 })).toEqual([]);
    expect(
      localSightings(site, { ...view, terrain: undefined }, { day: "2026-11-12", round: 0 }).length,
    ).toBeGreaterThan(0);
  });
  it("mantiene los mismos encuentros cuando la cámara se desplaza sobre las mismas celdas", () => {
    const site = getDestination("san-martin")!;
    const terrain = [
      {
        cellId: "a",
        coordinates: [-57.54, -38.02] as [number, number],
        habitat: "forest" as const,
      },
      {
        cellId: "b",
        coordinates: [-57.541, -38.021] as [number, number],
        habitat: "urban" as const,
      },
      {
        cellId: "c",
        coordinates: [-57.542, -38.022] as [number, number],
        habitat: "forest" as const,
      },
    ];
    const view: RadarView = {
      coordinates: [-57.54, -38.02],
      bounds: [-57.55, -38.03, -57.53, -38.01],
      zoom: 16,
      terrain,
    };
    const first = localSightings(site, view, { day: "2026-11-12", round: 0 });
    const moved = localSightings(
      site,
      { ...view, coordinates: [-57.539, -38.019], terrain: [...terrain].reverse() },
      { day: "2026-11-12", round: 0 },
    );
    expect(moved.map((e) => [e.pokemon.id, e.coordinates])).toEqual(
      first.map((e) => [e.pokemon.id, e.coordinates]),
    );
  });
  it("usa terreno cartografiado fuera de la ruta original sin inventar coordenadas", () => {
    const site = getDestination("san-martin")!;
    const terrain = [
      { coordinates: [-57.54, -38.02] as [number, number], habitat: "forest" as const },
      { coordinates: [-57.541, -38.021] as [number, number], habitat: "urban" as const },
    ];
    const view: RadarView = {
      coordinates: [-57.54, -38.02],
      bounds: [-57.55, -38.03, -57.53, -38.01],
      zoom: 16,
      terrain,
    };
    const result = localSightings(site, view, { day: "2026-11-12", round: 0 });
    expect(result.length).toBe(2);
    for (const entry of result) {
      expect(terrain.some((p) => p.coordinates === entry.coordinates)).toBe(true);
      expect(entry.terrainDerived).toBe(true);
    }
  });
  it("describe la vegetación detectada sin atribuirla a una región serrana", () => {
    const site = getDestination("san-martin")!;
    const view: RadarView = {
      coordinates: [-57.54, -38.02],
      bounds: [-57.55, -38.03, -57.53, -38.01],
      zoom: 16,
      terrain: [{ coordinates: [-57.54, -38.02], habitat: "grassland" }],
    };
    const [sighting] = localSightings(site, view, { day: "2026-11-12", round: 0 });
    expect(sighting?.reason).toBe("Afinidad con la vegetación abierta");
  });
  it("concentra los encuentros en el encuadre sin salir del hábitat", () => {
    const site = getDestination("san-martin")!;
    const view: RadarView = {
      coordinates: site.area.center,
      bounds: [-57.531, -38.025, -57.529, -38.023],
      zoom: 17,
    };
    const found = localSightings(site, view, { day: "2026-11-11", round: 0 });
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found.map((e) => e.pokemon.id)).size).toBe(found.length);
    for (const entry of found) {
      expect(isWithinBounds(entry.coordinates, view.bounds)).toBe(true);
      expect(isPointInArea(entry.coordinates, site.area)).toBe(true);
    }
    expect(localSightings(site, view, { day: "2026-11-11", round: 0 })).toEqual(found);
  });
  it("no devuelve señales lejanas cuando la vista está fuera del terreno", () => {
    const site = getDestination("san-martin")!;
    expect(
      localSightings(
        site,
        { coordinates: [-57.5, -38.02], bounds: [-57.51, -38.03, -57.49, -38.01], zoom: 16 },
        { day: "2026-11-11", round: 0 },
      ),
    ).toEqual([]);
  });
});
