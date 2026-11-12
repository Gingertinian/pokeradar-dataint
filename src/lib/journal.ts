import { z } from "zod";
import type { BallKind } from "@/lib/capture-game";
import { distanceInMeters, type Coordinate } from "@/lib/geography";
const entrySchema = z.object({
  pokemonId: z.number().int().min(1).max(386),
  siteId: z.string().max(60),
  seenAt: z.string().datetime(),
  weather: z.string().max(60).nullable(),
  outsideSite: z.boolean().optional(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]).optional(),
});
const collectionRecordSchema = z.object({
  pokemonId: z.number().int().min(1).max(386),
  siteId: z.string().max(60).nullable(),
  recordedAt: z.string().datetime(),
  method: z.enum(["capture", "team"]),
  ball: z.enum(["poke", "great", "ultra"]).nullable(),
  attempts: z.number().int().positive().nullable(),
  quality: z.string().max(100).nullable(),
});
const schema = z.object({
  version: z.literal(1),
  entries: z.array(entrySchema).max(6000),
  visits: z.array(z.string().max(60)).max(100),
  collection: z.array(collectionRecordSchema).max(386).default([]),
});
export type JournalEntry = z.infer<typeof entrySchema>;
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
export type Journal = z.infer<typeof schema>;
export type CaptureDetails = { ball: BallKind; attempts: number; quality: string };
export function sightingCoordinate([longitude, latitude]: Coordinate): Coordinate | undefined {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 85)
    return undefined;
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return [Number(wrapped.toFixed(5)), Number(latitude.toFixed(5))];
}
export function readJournal(raw: string | null): Journal | null {
  if (raw === null) return { version: 1, entries: [], visits: [], collection: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {}
  return null;
}
export function parseJournal(raw: string | null): Journal {
  return readJournal(raw) ?? { version: 1, entries: [], visits: [], collection: [] };
}
export function addSighting(current: Journal, entry: JournalEntry): Journal {
  const previous = current.entries.findIndex(
    (old) =>
      old.pokemonId === entry.pokemonId &&
      old.siteId === entry.siteId &&
      old.outsideSite === entry.outsideSite &&
      (old.coordinates && entry.coordinates
        ? distanceInMeters(old.coordinates, entry.coordinates) < 100
        : !old.coordinates && !entry.coordinates),
  );
  if (previous >= 0) return current;
  return {
    ...current,
    visits: entry.outsideSite ? current.visits : [...new Set([...current.visits, entry.siteId])],
    entries: [entry, ...current.entries].slice(0, 6000),
  };
}
export function addCollectionRecord(current: Journal, record: CollectionRecord): Journal {
  const previous = current.collection.find((entry) => entry.pokemonId === record.pokemonId);
  if (previous?.method === "capture" || (previous && record.method === "team")) return current;
  return {
    ...current,
    collection: [
      record,
      ...current.collection.filter((entry) => entry.pokemonId !== record.pokemonId),
    ],
  };
}
export function importTeam(current: Journal, team: readonly number[], at: string): Journal {
  return team.reduce((journal, pokemonId) => {
    if (!Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 386) return journal;
    return addCollectionRecord(journal, {
      pokemonId,
      siteId: current.entries.find((e) => e.pokemonId === pokemonId)?.siteId ?? null,
      recordedAt: at,
      method: "team",
      ball: null,
      attempts: null,
      quality: null,
    });
  }, current);
}
