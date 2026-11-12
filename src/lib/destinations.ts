import data from "@/data/destinations.json";
import {
  areaSchema,
  placeEncounters,
  seededRandom,
  type Coordinate,
  type MapBounds,
} from "@/lib/geography";
import { POKEMON, findPokemon, type CatalogEntry } from "@/lib/catalog";
import { getRegion, type RegionId, type Region, type Sighting } from "@/lib/regions";
import { weatherAffinity, weatherLabel, type Weather } from "@/lib/weather";
import type { PokemonType } from "@/lib/pokemon";

export type Habitat =
  "coast" | "forest" | "riverside" | "mountain" | "grassland" | "glacier" | "urban";
export const REGION_GUIDES: Record<RegionId, number> = {
  costa: 131,
  selva: 1,
  cordillera: 6,
  pampa: 25,
  patagonia: 363,
};
export const DESTINATION_GUIDES: Record<string, number> = {
  "san-martin": 131,
  camet: 43,
  macuco: 252,
  "tres-fronteras": 183,
  rolon: 123,
  horcones: 246,
  "puente-inca": 74,
  villavicencio: 27,
  independencia: 25,
  calvario: 163,
  movediza: 95,
  "perito-moreno": 363,
  "los-condores": 227,
  "bosque-calafate": 133,
};
export const HABITATS: Record<
  Habitat,
  { label: string; types: PokemonType[]; canonical: string[]; signature: number }
> = {
  coast: {
    label: "Costa atlántica",
    types: ["water", "ice", "flying"],
    canonical: ["sea", "waters-edge"],
    signature: 131,
  },
  forest: {
    label: "Bosque y selva",
    types: ["grass", "bug", "poison"],
    canonical: ["forest"],
    signature: 252,
  },
  riverside: {
    label: "Ribera de río",
    types: ["water", "electric", "flying"],
    canonical: ["waters-edge"],
    signature: 183,
  },
  mountain: {
    label: "Montaña y roca",
    types: ["rock", "ground", "fire", "steel"],
    canonical: ["mountain", "cave", "rough-terrain"],
    signature: 246,
  },
  grassland: {
    label: "Pradera serrana",
    types: ["normal", "flying", "grass", "electric"],
    canonical: ["grassland"],
    signature: 25,
  },
  glacier: {
    label: "Bosque glaciar",
    types: ["ice", "water", "rock"],
    canonical: ["waters-edge", "sea"],
    signature: 363,
  },
  urban: {
    label: "Entorno urbano",
    types: ["normal", "electric", "psychic", "fairy", "ghost"],
    canonical: ["urban"],
    signature: 133,
  },
};

export type Destination = {
  viewBounds: MapBounds;
  id: string;
  regionId: RegionId;
  name: string;
  locality: string;
  habitat: Habitat;
  headline: string;
  description: string;
  area: ReturnType<typeof areaSchema.parse>;
};
export const DESTINATIONS: Destination[] = data.sites.map((entry) => ({
  ...entry,
  regionId: entry.regionId as RegionId,
  habitat: entry.habitat as Habitat,
  area: areaSchema.parse(entry.area),
  viewBounds: areaSchema.shape.bounds.parse(
    "viewBounds" in entry ? entry.viewBounds : entry.area.bounds,
  ),
}));
export const DEFAULT_DESTINATION = DESTINATIONS[0]!;
export type ExpeditionSighting = Sighting & {
  habitat?: Habitat;
  terrainDerived?: boolean;
  siteId: string;
  reason: string;
  boosted: boolean;
  mystery: boolean;
};

export function getDestination(id: string | null | undefined): Destination | undefined {
  return DESTINATIONS.find((entry) => entry.id === id);
}
export function regionDestinations(regionId: RegionId): Destination[] {
  return DESTINATIONS.filter((entry) => entry.regionId === regionId);
}
export function destinationRegion(site: Destination): Region {
  return { ...getRegion(site.regionId), area: site.area, center: site.area.center, zoom: 16 };
}
export function boundsOf(coordinates: Coordinate[]): MapBounds {
  return [
    Math.min(...coordinates.map((p) => p[0])),
    Math.min(...coordinates.map((p) => p[1])),
    Math.max(...coordinates.map((p) => p[0])),
    Math.max(...coordinates.map((p) => p[1])),
  ];
}

function habitatScore(pokemon: CatalogEntry, habitat: Habitat): number {
  if (pokemon.habitat === "sea" && habitat !== "coast" && habitat !== "glacier") return 0;
  const profile = HABITATS[habitat];
  return (
    pokemon.types.filter((type) => profile.types.includes(type)).length * 3 +
    (profile.canonical.includes(pokemon.habitat ?? "") ? 2 : 0)
  );
}

export function createExpeditionSightings(
  site: Destination,
  options: {
    day: string;
    round: number;
    weather?: Weather | null;
    pinnedId?: number | null;
  },
): ExpeditionSighting[] {
  const affinity = weatherAffinity(options.weather);
  const seed = `${site.id}:${options.day}:${options.round}:${affinity.join(",")}`;
  const ranked = POKEMON.filter((entry) => habitatScore(entry, site.habitat) > 0)
    .map((pokemon) => {
      const random = seededRandom(`${seed}:${pokemon.id}`);
      const boosted = pokemon.types.some((type) => affinity.includes(type));
      const weight =
        habitatScore(pokemon, site.habitat) * (boosted ? 2.8 : 1) * (pokemon.legendary ? 0.14 : 1);
      return { pokemon, boosted, rank: -Math.log(Math.max(0.000001, random())) / weight };
    })
    .sort((a, b) => a.rank - b.rank);
  const count = site.id === "macuco" ? 8 : 12;
  const ids = new Set<number>();
  const signature = HABITATS[site.habitat].signature;
  if (options.round === 0) ids.add(signature);
  if (options.pinnedId && ranked.some((entry) => entry.pokemon.id === options.pinnedId))
    ids.add(options.pinnedId);
  for (const generation of [1, 2, 3]) {
    const match = ranked.find((entry) => entry.pokemon.generation === generation);
    if (match) ids.add(match.pokemon.id);
  }
  for (const entry of ranked) {
    if (ids.size >= count) break;
    ids.add(entry.pokemon.id);
  }
  const species = [...ids];
  const positions = placeEncounters(site.area, species, seed);
  return species.map((id, index) => {
    const pokemon = findPokemon(id)!;
    const boosted = pokemon.types.some((type) => affinity.includes(type));
    const reason =
      boosted && options.weather
        ? `Favorecido por ${weatherLabel(options.weather).toLocaleLowerCase("es-AR")}`
        : `Afinidad con ${HABITATS[site.habitat].label.toLocaleLowerCase("es-AR")}`;
    return {
      key: `${site.id}:${id}`,
      pokemon,
      regionId: site.regionId,
      siteId: site.id,
      coordinates: positions[index]!,
      reason,
      boosted,
      mystery: index % 4 === 3,
    };
  });
}
