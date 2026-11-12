import { catalogMetadata, findPokemon } from "@/lib/catalog";
import { matchesPokemon } from "@/lib/exploration";
import { regionDestinations } from "@/lib/destinations";
import type { PokemonSummary, PokemonType } from "@/lib/pokemon";
import type { RegionId } from "@/lib/regions";
import type { JournalEntry } from "@/hooks/use-journal";

export type ExpeditionFilters = {
  search: string;
  types: PokemonType[];
  generation: number;
  minimum: number;
  maximum: number;
  unseenOnly: boolean;
};
export const EMPTY_FILTERS: ExpeditionFilters = {
  search: "",
  types: [],
  generation: 0,
  minimum: 0,
  maximum: 780,
  unseenOnly: false,
};

export function companionTypesSelected(
  filters: ExpeditionFilters,
  companion: PokemonSummary | undefined,
): boolean {
  return Boolean(
    companion &&
    companion.types.length === filters.types.length &&
    companion.types.every((type) => filters.types.includes(type)),
  );
}

export function followCompanionFilter(
  filters: ExpeditionFilters,
  previous: PokemonSummary | undefined,
  next: PokemonSummary | undefined,
): ExpeditionFilters {
  if (!companionTypesSelected(filters, previous)) return filters;
  return { ...filters, types: next ? [...next.types] : [] };
}

export function matchesFilters(
  pokemon: PokemonSummary,
  filters: ExpeditionFilters,
  seen: boolean,
): boolean {
  const metadata = catalogMetadata(pokemon);
  return (
    matchesPokemon(pokemon, filters.search, "all") &&
    (!filters.types.length || pokemon.types.some((type) => filters.types.includes(type))) &&
    (!filters.generation || metadata?.generation === filters.generation) &&
    (metadata?.baseStatTotal ?? 0) >= filters.minimum &&
    (metadata?.baseStatTotal ?? 0) <= filters.maximum &&
    (!filters.unseenOnly || !seen)
  );
}
export function filterCount(filters: ExpeditionFilters): number {
  return (
    filters.types.length +
    Number(filters.generation !== 0) +
    Number(filters.minimum > 0 || filters.maximum < 780) +
    Number(filters.unseenOnly)
  );
}

export function regionMission(regionId: RegionId, entries: JournalEntry[], visits: string[]) {
  const sites = regionDestinations(regionId).map((site) => site.id);
  const records = entries.filter((entry) => sites.includes(entry.siteId) && !entry.outsideSite);
  const species = new Set(records.map((entry) => entry.pokemonId));
  const types = new Set(records.flatMap((entry) => findPokemon(entry.pokemonId)?.types ?? []));
  const visited = visits.filter((id) => sites.includes(id));
  return [
    { label: "Registrar 4 especies", value: species.size, target: 4 },
    { label: "Encontrar 3 tipos distintos", value: types.size, target: 3 },
    { label: "Explorar 2 lugares", value: visited.length, target: 2 },
  ];
}
