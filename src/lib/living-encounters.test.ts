import { describe, expect, it } from "vitest";
import { createExpeditionSightings, getDestination } from "./destinations";
import { isNearBounds } from "./geography";
import { renewEncounters } from "./living-encounters";
import { radarTargets } from "./local-radar";

const site = getDestination("perito-moreno")!;
const sightings = createExpeditionSightings(site, { day: "2026-11-12", round: 0 });

describe("Continuidad de la exploración", () => {
  it("no coloca nuevos encuentros sobre una celda que sigue ocupada", () => {
    const kept = sightings[2]!;
    const overlap = { ...sightings[3]!, coordinates: kept.coordinates };
    const replacement = sightings[4]!;
    const result = renewEncounters(sightings.slice(0, 3), [overlap, replacement], [], null, 2);
    expect(result.map((entry) => entry.pokemon.id)).toEqual([
      kept.pokemon.id,
      replacement.pokemon.id,
    ]);
  });

  it("mantiene el encuentro protegido y no reincorpora especies retiradas", () => {
    const protectedEntry = sightings[0]!;
    const removed = sightings[3]!;
    const result = renewEncounters(
      sightings.slice(0, 3),
      [removed, sightings[4]!],
      [removed.pokemon.id],
      protectedEntry.pokemon.id,
      3,
    );
    expect(result.some((entry) => entry.pokemon.id === protectedEntry.pokemon.id)).toBe(true);
    expect(result.some((entry) => entry.pokemon.id === removed.pokemon.id)).toBe(false);
  });

  it("mantiene las señales existentes cuando no hay reemplazos disponibles", () => {
    const current = sightings.slice(0, 4);
    const generated = current.map((entry, index) => ({
      ...sightings[index + 4]!,
      coordinates: entry.coordinates,
    }));
    const result = renewEncounters(current, generated.slice(2), [], null, current.length);
    expect(result).toHaveLength(current.length);
    expect(result.map((entry) => entry.pokemon.id)).toEqual([
      current[2]!.pokemon.id,
      current[3]!.pokemon.id,
      current[0]!.pokemon.id,
      current[1]!.pokemon.id,
    ]);
  });

  it("no devuelve dos rastros superpuestos para una búsqueda", () => {
    const origin = site.area.center;
    const first = { ...sightings[0]!, coordinates: origin };
    const overlap = { ...sightings[1]!, coordinates: origin };
    const far = {
      ...sightings[2]!,
      coordinates: [origin[0] + 0.02, origin[1]] as [number, number],
    };
    expect(radarTargets([overlap, first, far], origin, 14)).toEqual([overlap, far]);
  });

  it("mantiene separados los rastros elegidos aunque haya señales a ambos lados", () => {
    const origin = site.area.center;
    const delta = (60 * 360) / (512 * 2 ** 14);
    const first = { ...sightings[0]!, coordinates: origin };
    const east = {
      ...sightings[1]!,
      coordinates: [origin[0] + delta, origin[1]] as [number, number],
    };
    const west = {
      ...sightings[2]!,
      coordinates: [origin[0] - delta, origin[1]] as [number, number],
    };
    expect(radarTargets([first, east, west], origin, 14)).toEqual([first]);
  });

  it("prioriza rastros nuevos y completa la búsqueda con conocidos cercanos", () => {
    const origin = site.area.center;
    const knownNear = { ...sightings[0]!, coordinates: origin };
    const unknown = {
      ...sightings[1]!,
      coordinates: [origin[0] + 0.02, origin[1]] as [number, number],
    };
    const knownFar = {
      ...sightings[2]!,
      coordinates: [origin[0] - 0.03, origin[1]] as [number, number],
    };
    const discovered = new Set([knownNear.key, knownFar.key]);
    expect(radarTargets([knownFar, knownNear, unknown], origin, 14, discovered)).toEqual([
      unknown,
      knownNear,
      knownFar,
    ]);
  });

  it("reconoce la vista del lugar aunque el encuadre desplace un poco el centro", () => {
    expect(isNearBounds([-73.02593396, -50.46853646], site.viewBounds, 200)).toBe(true);
    expect(isNearBounds([-72.9, -50.46], site.viewBounds, 200)).toBe(false);
  });
});
