import { describe, expect, it } from "vitest";
import { DESTINATIONS, createExpeditionSightings, getDestination } from "@/lib/destinations";
import { isPointInArea, isWithinBounds } from "@/lib/geography";
import {
  EMPTY_FILTERS,
  followCompanionFilter,
  matchesFilters,
  regionMission,
} from "@/lib/expedition";
import { findPokemon } from "@/lib/catalog";
import { weatherAffinity, weatherKind, type Weather } from "@/lib/weather";

const snow: Weather = {
  temperature: -2,
  feelsLike: -5,
  wind: 12,
  code: 73,
  isDay: true,
  reportedAt: "2026-11-11T12:00",
  timezone: "America/Argentina/Buenos_Aires",
};
describe("Expedición contextual", () => {
  it("sigue al compañero solo si su filtro estaba activo y conserva los demás criterios", () => {
    const tropius = findPokemon(357)!,
      surskit = findPokemon(283)!;
    const active = { ...EMPTY_FILTERS, search: "sur", types: [...tropius.types], generation: 3 };
    const updated = followCompanionFilter(active, tropius, surskit);
    expect(updated.types).toEqual(surskit.types);
    expect(updated.search).toBe("sur");
    expect(updated.generation).toBe(3);
    expect(followCompanionFilter(active, tropius, undefined).types).toEqual([]);
    const custom = { ...active, types: ["grass"] as const };
    expect(
      followCompanionFilter({ ...custom, types: [...custom.types] }, tropius, surskit).types,
    ).toEqual(["grass"]);
  });
  it("no traslada una especie marina al bosque por su tipo secundario", () => {
    const options = { day: "2026-11-11", round: 0, pinnedId: 72 };
    const forest = createExpeditionSightings(getDestination("camet")!, options);
    const coast = createExpeditionSightings(getDestination("san-martin")!, options);
    expect(forest.some((entry) => findPokemon(entry.pokemon.id)?.habitat === "sea")).toBe(false);
    expect(coast.some((entry) => entry.pokemon.id === 72)).toBe(true);
  });
  it("mantiene todos los encuentros sobre los terrenos o senderos reales de cada destino", () => {
    for (const site of DESTINATIONS) {
      const entries = createExpeditionSightings(site, {
        day: "2026-11-11",
        round: 0,
        weather: snow,
      });
      expect(new Set(entries.map((entry) => entry.pokemon.id)).size).toBe(entries.length);
      for (const entry of entries) {
        expect(isWithinBounds(entry.coordinates, site.area.bounds), site.id).toBe(true);
        expect(isPointInArea(entry.coordinates, site.area), `${site.id}:${entry.pokemon.id}`).toBe(
          true,
        );
      }
    }
    expect(isPointInArea([-69.9432192, -32.8056349], getDestination("horcones")!.area)).toBe(false);
  });
  it("reproduce una búsqueda y permite renovar tanto especies como posiciones", () => {
    const site = getDestination("perito-moreno")!;
    const first = createExpeditionSightings(site, { day: "2026-11-11", round: 0 });
    expect(createExpeditionSightings(site, { day: "2026-11-11", round: 0 })).toEqual(first);
    const next = createExpeditionSightings(site, { day: "2026-11-11", round: 1 });
    expect(next.map((entry) => entry.pokemon.id)).not.toEqual(
      first.map((entry) => entry.pokemon.id),
    );
    expect(next.map((entry) => entry.coordinates)).not.toEqual(
      first.map((entry) => entry.coordinates),
    );
  });
  it("interpreta nieve, tormenta y noche sin inventar clima cuando falta la fuente", () => {
    expect(weatherKind(73)).toBe("snow");
    expect(weatherKind(85)).toBe("snow");
    expect(weatherKind(95)).toBe("storm");
    expect(weatherAffinity(snow)).toEqual(["ice"]);
    expect(weatherAffinity({ ...snow, code: 0, isDay: false })).toEqual(["ghost", "dark"]);
    expect(weatherAffinity(undefined)).toEqual([]);
    const entries = createExpeditionSightings(getDestination("perito-moreno")!, {
      day: "2026-11-11",
      round: 0,
      weather: snow,
    });
    expect(entries.some((entry) => entry.boosted)).toBe(true);
    expect(
      entries
        .filter((entry) => entry.boosted)
        .every((entry) => entry.pokemon.types.includes("ice")),
    ).toBe(true);
  });
  it("combina tipo, generación, estadísticas y estado de registro", () => {
    const lapras = findPokemon(131)!;
    expect(
      matchesFilters(
        lapras,
        { ...EMPTY_FILTERS, types: ["ice", "fire"], generation: 1, minimum: 500, maximum: 550 },
        false,
      ),
    ).toBe(true);
    expect(matchesFilters(lapras, { ...EMPTY_FILTERS, generation: 3 }, false)).toBe(false);
    expect(matchesFilters(lapras, { ...EMPTY_FILTERS, minimum: 600 }, false)).toBe(false);
    expect(matchesFilters(lapras, { ...EMPTY_FILTERS, unseenOnly: true }, true)).toBe(false);
  });
  it("calcula los objetivos con especies únicas y lugares de la región", () => {
    const entries = [
      { pokemonId: 131, siteId: "san-martin", seenAt: "2026-11-11T12:00:00Z", weather: null },
      { pokemonId: 131, siteId: "camet", seenAt: "2026-11-11T13:00:00Z", weather: null },
      { pokemonId: 25, siteId: "bosque-calafate", seenAt: "2026-11-11T14:00:00Z", weather: null },
    ];
    const goals = regionMission("costa", entries, ["san-martin", "camet", "bosque-calafate"]);
    expect(goals.map((goal) => goal.value)).toEqual([1, 2, 2]);
  });
  it("no cuenta una señal fuera de la base como hallazgo regional", () => {
    const entries = [
      {
        pokemonId: 25,
        siteId: "san-martin",
        seenAt: "2026-11-12T12:00:00Z",
        weather: null,
        outsideSite: true,
      },
    ];
    expect(regionMission("costa", entries, []).map((goal) => goal.value)).toEqual([0, 0, 0]);
  });
});
