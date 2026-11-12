import { z } from "zod";
import {
  POKEMON_TYPES,
  STAT_NAMES,
  pokemonDetailSchema,
  spriteUrl,
  type PokemonDetail,
} from "@/lib/pokemon";

const rawPokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  types: z
    .array(
      z.object({
        slot: z.number(),
        type: z.object({ name: z.enum(POKEMON_TYPES) }),
      }),
    )
    .min(1)
    .max(2),
  stats: z
    .array(
      z.object({
        base_stat: z.number().int().min(0).max(255),
        stat: z.object({ name: z.enum(STAT_NAMES) }),
      }),
    )
    .length(6),
  abilities: z.array(z.object({ ability: z.object({ name: z.string() }) })),
  sprites: z.object({
    front_default: z.string().nullable(),
    other: z
      .object({
        "official-artwork": z.object({ front_default: z.string().nullable() }),
      })
      .optional(),
    versions: z
      .object({
        "generation-v": z.object({
          "black-white": z.object({
            animated: z.object({ front_default: z.string().nullable() }),
          }),
        }),
      })
      .optional(),
  }),
  cries: z.object({ latest: z.string().nullable() }).optional(),
});

const speciesSchema = z.object({
  is_legendary: z.boolean(),
  genera: z.array(z.object({ genus: z.string(), language: z.object({ name: z.string() }) })),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: z.object({ name: z.string() }),
    }),
  ),
});

export class PokemonApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PokemonApiError";
  }
}

async function readResource(resource: string, id: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://pokeapi.co/api/v2/${resource}/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new PokemonApiError(503, "PokéAPI no está disponible en este momento.");
  }
  if (!response.ok) {
    throw new PokemonApiError(
      response.status === 404 ? 404 : 502,
      "No pudimos obtener esta ficha de PokéAPI.",
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new PokemonApiError(502, "La respuesta de PokéAPI no se pudo leer.");
  }
}

function imageFromProvider(value: string | null | undefined, fallback: string): string {
  return value?.startsWith("https://raw.githubusercontent.com/PokeAPI/sprites/") ? value : fallback;
}

export async function getPokemonDetail(id: number): Promise<PokemonDetail> {
  const [rawPokemon, rawSpecies] = await Promise.all([
    readResource("pokemon", id),
    readResource("pokemon-species", id).catch(() => null),
  ]);
  const parsed = rawPokemonSchema.safeParse(rawPokemon);
  if (!parsed.success || parsed.data.id !== id) {
    throw new PokemonApiError(502, "La ficha recibida no tiene el formato esperado.");
  }
  const pokemon = parsed.data;
  const speciesResult = speciesSchema.safeParse(rawSpecies);
  const species = speciesResult.success ? speciesResult.data : null;
  const description = species?.flavor_text_entries
    .slice()
    .reverse()
    .find((entry) => entry.language.name === "es")?.flavor_text;
  const animated = pokemon.sprites.versions?.["generation-v"]["black-white"].animated.front_default;
  const sprite = imageFromProvider(pokemon.sprites.front_default, spriteUrl(id));

  const detail = pokemonDetailSchema.safeParse({
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name),
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    sprite,
    artwork: imageFromProvider(pokemon.sprites.other?.["official-artwork"].front_default, sprite),
    animatedSprite: animated ? imageFromProvider(animated, sprite) : null,
    cry: pokemon.cries?.latest?.startsWith("https://raw.githubusercontent.com/PokeAPI/cries/")
      ? pokemon.cries.latest
      : null,
    description:
      description
        ?.replace(/[\n\f\r]+/g, " ")
        .replace(/\s+/g, " ")
        .trim() ?? null,
    genus: species?.genera.find((entry) => entry.language.name === "es")?.genus ?? null,
    legendary: species?.is_legendary ?? false,
    abilities: pokemon.abilities.map((entry) => entry.ability.name),
    stats: STAT_NAMES.map((name) => ({
      name,
      value: pokemon.stats.find((stat) => stat.stat.name === name)?.base_stat,
    })),
  });
  if (!detail.success)
    throw new PokemonApiError(502, "Las características de esta ficha están incompletas.");
  return detail.data;
}
