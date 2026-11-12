import { describe, expect, it } from "vitest";
import { POKEMON } from "@/lib/catalog";
import {
  filterSightings,
  leadTeamMember,
  matchesCollectionSearch,
  matchesPokemon,
  parseTeam,
  toggleTeamMember,
} from "@/lib/exploration";
import type { PokemonType } from "@/lib/pokemon";
import { createSightings, getRegion, type Sighting } from "@/lib/regions";

const catalogueSightings: Sighting[] = POKEMON.map((pokemon) => ({
  key: `catalogue:${pokemon.id}`,
  pokemon,
  regionId: "pampa",
  coordinates: [-59.13, -37.33],
}));

describe("matchesPokemon", () => {
  it.each([
    { query: "  ChAr  ", ids: [4, 5, 6] },
    { query: "PI\u0301KA\u0301CHU\u0301", ids: [25] },
    { query: "Mr. Mime", ids: [122] },
    { query: "farfetch'd", ids: [83] },
    { query: "NÍDORÁN", ids: [29, 32] },
    { query: "nidoran-f", ids: [29] },
    { query: "nidoran-m", ids: [32] },
    { query: "#006", ids: [6] },
    { query: " 25 ", ids: [25] },
    { query: "1", ids: [1] },
    { query: "missingno", ids: [] },
  ])("finds $query by name or exact Pokédex number", ({ query, ids }) => {
    expect(
      POKEMON.filter((pokemon) => matchesPokemon(pokemon, query, "all")).map(({ id }) => id),
    ).toEqual(ids);
  });

  it("applies the type restriction to raw canonical aliases", () => {
    expect(
      POKEMON.filter((pokemon) => matchesPokemon(pokemon, "nidoran-f", "poison")).map(
        ({ id }) => id,
      ),
    ).toEqual([29]);
    expect(POKEMON.filter((pokemon) => matchesPokemon(pokemon, "nidoran-f", "ground"))).toEqual([]);
  });
});

describe("búsqueda de Pokédex", () => {
  it("encuentra nombres registrados sin revelar nombres de especies desconocidas", () => {
    const pikachu = POKEMON.find((entry) => entry.id === 25)!;
    expect(matchesCollectionSearch(pikachu, "píkachu", true)).toBe(true);
    expect(matchesCollectionSearch(pikachu, "pikachu", false)).toBe(false);
    expect(matchesCollectionSearch(pikachu, "#025", false)).toBe(true);
    expect(matchesCollectionSearch(pikachu, "#026", false)).toBe(false);
  });
});

describe("filterSightings", () => {
  it("combines the query with either type of a dual-type Pokémon", () => {
    expect(
      filterSightings(catalogueSightings, "char", "flying").map(({ pokemon }) => pokemon.id),
    ).toEqual([6]);
    expect(
      filterSightings(catalogueSightings, "char", "fire").map(({ pokemon }) => pokemon.id),
    ).toEqual([4, 5, 6]);
    expect(filterSightings(catalogueSightings, "Pikachu", "water")).toEqual([]);
  });

  it("preserves every sighting for a blank query and handles an empty region", () => {
    expect(filterSightings(catalogueSightings, "   ", "all")).toEqual(catalogueSightings);
    expect(filterSightings([], "Pikachu", "electric")).toEqual([]);
  });

  it.each<{ query: string; type: PokemonType; ids: number[] }>([
    { query: "PSÝ", type: "water", ids: [54] },
    { query: "", type: "ice", ids: [131] },
  ])(
    "keeps marker identities and coordinates when filtering by $query/$type",
    ({ query, type, ids }) => {
      const sightings = createSightings(getRegion("costa"));
      const original = structuredClone(sightings);
      const filtered = filterSightings(sightings, query, type);

      expect(filtered.map(({ pokemon }) => pokemon.id)).toEqual(ids);
      for (const sighting of filtered) {
        expect(sighting).toEqual(
          original.find(({ pokemon }) => pokemon.id === sighting.pokemon.id),
        );
      }
      expect(sightings).toEqual(original);
      expect(createSightings(getRegion("costa"))).toEqual(original);
    },
  );
});

describe("parseTeam", () => {
  it.each(["legacy", "versioned"] as const)(
    "repairs %s storage while preserving the first six unique valid IDs",
    (format) => {
      const ids: unknown[] = [1, 25, 25, 0, 387, -1, 2.5, "6", null, {}, false, 151, 4, 7, 8, 9];
      const stored = JSON.stringify(format === "legacy" ? ids : { version: 1, ids });

      expect(parseTeam(stored)).toEqual([1, 25, 151, 4, 7, 8]);
    },
  );

  it.each([
    null,
    "",
    "{broken json",
    "null",
    "true",
    "25",
    '"[1,25]"',
    '{"ids":[1,25]}',
    '{"version":2,"ids":[1,25]}',
    '{"version":"1","ids":[1,25]}',
    '{"version":1,"ids":null}',
    '{"version":1,"ids":"1,25"}',
  ])("recovers safely from unusable storage %j", (stored) => {
    expect(parseTeam(stored)).toEqual([]);
  });
});

describe("toggleTeamMember", () => {
  it("cambia el acompañante sin perder ni duplicar integrantes", () => {
    const team = [1, 25, 151];
    expect(leadTeamMember(team, 151)).toEqual([151, 1, 25]);
    expect(leadTeamMember(team, 44)).toEqual(team);
    expect(team).toEqual([1, 25, 151]);
  });
  it("adds a sixth member without mutating the existing team", () => {
    const team = [1, 4, 7, 25, 39];

    expect(toggleTeamMember(team, 133)).toEqual([1, 4, 7, 25, 39, 133]);
    expect(team).toEqual([1, 4, 7, 25, 39]);
  });

  it("toggles an existing ID out instead of creating a duplicate", () => {
    expect(toggleTeamMember([1, 25, 151], 25)).toEqual([1, 151]);
  });

  it("rejects a seventh member but allows removal at capacity and a replacement", () => {
    const fullTeam = [1, 4, 7, 25, 39, 133];

    expect(toggleTeamMember(fullTeam, 151)).toEqual(fullTeam);
    const afterRemoval = toggleTeamMember(fullTeam, 25);
    expect(afterRemoval).toEqual([1, 4, 7, 39, 133]);
    expect(toggleTeamMember(afterRemoval, 151)).toEqual([1, 4, 7, 39, 133, 151]);
    expect(fullTeam).toEqual([1, 4, 7, 25, 39, 133]);
  });

  it.each([0, -1, 387, 1.5, NaN, Infinity])("ignores invalid ID %s", (id) => {
    const team = [1, 151];
    expect(toggleTeamMember(team, id)).toEqual([1, 151]);
    expect(team).toEqual([1, 151]);
  });
});
