import { pokemonName, type PokemonSummary, type PokemonType } from "@/lib/pokemon";
import type { Sighting } from "@/lib/regions";

export function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function filterSightings(
  sightings: Sighting[],
  search: string,
  type: PokemonType | "all",
): Sighting[] {
  return sightings.filter(({ pokemon }) => matchesPokemon(pokemon, search, type));
}

export function matchesPokemon(
  pokemon: PokemonSummary,
  search: string,
  type: PokemonType | "all",
): boolean {
  const query = normalizeSearch(search);
  const numeric = /^#?\d+$/.test(search.trim()) ? Number(search.trim().replace("#", "")) : null;
  const matchesType = type === "all" || pokemon.types.includes(type);
  const matchesSearch =
    numeric !== null
      ? pokemon.id === numeric
      : normalizeSearch(pokemonName(pokemon.name)).includes(query) ||
        normalizeSearch(pokemon.name).includes(query);
  return matchesType && matchesSearch;
}

export function matchesCollectionSearch(
  pokemon: PokemonSummary,
  search: string,
  known: boolean,
): boolean {
  if (!search.trim()) return true;
  if (known) return matchesPokemon(pokemon, search, "all");
  return /^#?\d+$/.test(search.trim()) && Number(search.trim().replace("#", "")) === pokemon.id;
}

export const TEAM_LIMIT = 6;

export function isReadableTeam(value: string | null): boolean {
  if (value === null) return true;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      Array.isArray(parsed) ||
      (typeof parsed === "object" &&
        parsed !== null &&
        "version" in parsed &&
        parsed.version === 1 &&
        "ids" in parsed &&
        Array.isArray(parsed.ids))
    );
  } catch {
    return false;
  }
}

export function parseTeam(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    const candidates: unknown = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" &&
          parsed !== null &&
          "version" in parsed &&
          parsed.version === 1 &&
          "ids" in parsed
        ? parsed.ids
        : [];
    if (!Array.isArray(candidates)) return [];
    return [
      ...new Set(
        candidates.filter(
          (id): id is number =>
            typeof id === "number" && Number.isInteger(id) && id >= 1 && id <= 386,
        ),
      ),
    ].slice(0, TEAM_LIMIT);
  } catch {
    return [];
  }
}

export function toggleTeamMember(team: number[], id: number): number[] {
  if (!Number.isInteger(id) || id < 1 || id > 386) return team;
  if (team.includes(id)) return team.filter((member) => member !== id);
  return team.length < TEAM_LIMIT ? [...team, id] : team;
}

export function leadTeamMember(team: number[], id: number): number[] {
  if (!team.includes(id) || team[0] === id) return team;
  return [id, ...team.filter((member) => member !== id)];
}
