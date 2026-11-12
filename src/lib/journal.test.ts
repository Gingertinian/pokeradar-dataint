import { describe, it, expect } from "vitest";
import {
  parseJournal,
  addCollectionRecord,
  addSighting,
  importTeam,
  sightingCoordinate,
} from "./journal";
describe("Colección persistente", () => {
  it("conserva zonas distintas de una misma especie y evita duplicar hallazgos cercanos", () => {
    const first = {
      pokemonId: 25,
      siteId: "san-martin",
      seenAt: "2026-11-11T20:00:00Z",
      weather: null,
      outsideSite: true,
      coordinates: [-57.53, -38.02] as [number, number],
    };
    const initial = addSighting(parseJournal(null), first);
    const nearby = { ...first, coordinates: [-57.5301, -38.0201] as [number, number] };
    expect(addSighting(initial, nearby)).toBe(initial);
    const distant = {
      ...first,
      seenAt: "2026-11-11T21:00:00Z",
      coordinates: [-57.54, -38.03] as [number, number],
    };
    const updated = addSighting(initial, distant);
    expect(updated.entries).toEqual([distant, first]);
    expect(updated.visits).toEqual([]);
    expect(parseJournal(JSON.stringify(updated))).toEqual(updated);
  });
  it("guarda una posición simulada válida sin perder el registro anterior", () => {
    const old = {
      pokemonId: 25,
      siteId: "san-martin",
      seenAt: "2026-11-11T20:00:00Z",
      weather: null,
      outsideSite: true,
    };
    const initial = parseJournal(JSON.stringify({ version: 1, entries: [old], visits: [] }));
    const coordinates = sightingCoordinate([290.090126, -32.826777]);
    expect(coordinates).toEqual([-69.90987, -32.82678]);
    expect(sightingCoordinate([0, 89])).toBeUndefined();
    const newEntry = { ...old, seenAt: "2026-11-12T20:00:00Z", coordinates };
    const updated = addSighting(initial, newEntry);
    expect(updated.entries).toEqual([newEntry, old]);
    expect(parseJournal(JSON.stringify(updated))).toEqual(updated);
  });
  it("distingue hallazgos fuera de la base sin inventar una visita y conserva registros anteriores", () => {
    const legacy = {
      pokemonId: 25,
      siteId: "san-martin",
      seenAt: "2026-11-11T20:00:00Z",
      weather: null,
    };
    const initial = parseJournal(JSON.stringify({ version: 1, entries: [legacy], visits: [] }));
    const outside = {
      pokemonId: 25,
      siteId: "san-martin",
      seenAt: "2026-11-12T20:00:00Z",
      weather: null,
      outsideSite: true,
    };
    const away = addSighting(initial, outside);
    expect(away.visits).toEqual([]);
    expect(away.entries).toEqual([outside, legacy]);
    expect(addSighting(away, outside)).toBe(away);
    const inside = { ...outside, outsideSite: false };
    const returned = addSighting(away, inside);
    expect(returned.visits).toEqual(["san-martin"]);
    expect(returned.entries).toEqual([inside, outside, legacy]);
    expect(parseJournal(JSON.stringify(returned))).toEqual(returned);
  });
  it("conserva un registro anterior e importa el equipo sin inventar una captura", () => {
    const old = parseJournal(JSON.stringify({ version: 1, entries: [], visits: ["san-martin"] }));
    const next = importTeam(old, [25, 25, 131], "2026-11-11T20:00:00Z");
    expect(next.collection.map((e) => e.pokemonId)).toEqual([131, 25]);
    expect(next.collection.every((e) => e.method === "team" && e.ball === null)).toBe(true);
    expect(next.visits).toEqual(old.visits);
    expect(importTeam(next, [25, 131], "2026-11-11T21:00:00Z")).toEqual(next);
  });
  it("una captura reemplaza la procedencia importada y permanece al cambiar el equipo", () => {
    const initial = importTeam(parseJournal(null), [25], "2026-11-11T20:00:00Z");
    const record = {
      pokemonId: 25,
      siteId: "camet",
      recordedAt: "2026-11-11T21:00:00Z",
      method: "capture" as const,
      ball: "great" as const,
      attempts: 2,
      quality: "Gran impacto",
    };
    const next = addCollectionRecord(initial, record);
    expect(next.collection).toEqual([record]);
    expect(importTeam(next, [], "2026-11-11T22:00:00Z").collection).toEqual([record]);
    expect(addCollectionRecord(next, { ...record, attempts: 3 }).collection).toEqual([record]);
  });
});
