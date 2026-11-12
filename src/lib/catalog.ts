import catalog from "@/data/catalog.json";
import { pokemonSummarySchema, type PokemonSummary } from "@/lib/pokemon";
import { z } from "zod";

export const catalogEntrySchema = pokemonSummarySchema.extend({
  generation: z.number().int().min(1).max(3),
  habitat: z.string().nullable(),
  legendary: z.boolean(),
  captureRate: z.number().int().min(0).max(255),
  baseStatTotal: z.number().int().positive(),
});
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export const POKEMON = catalog.pokemon.map((pokemon) => catalogEntrySchema.parse(pokemon));
const byId = new Map(POKEMON.map((pokemon) => [pokemon.id, pokemon]));

export function findPokemon(id: number): CatalogEntry | undefined {
  return byId.get(id);
}

export function catalogMetadata(pokemon: PokemonSummary): CatalogEntry | undefined {
  return byId.get(pokemon.id);
}
