import type { ExpeditionSighting } from "./destinations";
import { distanceInMeters } from "./geography";

export function renewEncounters(
  current: ExpeditionSighting[],
  generated: ExpeditionSighting[],
  removed: number[],
  protectedId: number | null,
  limit: number,
): ExpeditionSighting[] {
  const unprotected = current.filter((entry) => entry.pokemon.id !== protectedId);
  const next = [
    ...unprotected.slice(2),
    ...current.filter((entry) => entry.pokemon.id === protectedId),
  ];
  for (const entry of [...generated, ...unprotected.slice(0, 2)]) {
    if (next.length >= limit) break;
    if (
      removed.includes(entry.pokemon.id) ||
      next.some(
        (existing) =>
          existing.pokemon.id === entry.pokemon.id ||
          distanceInMeters(existing.coordinates, entry.coordinates) < 1,
      )
    )
      continue;
    next.push(entry);
  }
  return next;
}
