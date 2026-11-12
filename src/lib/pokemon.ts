import { z } from "zod";

export const POKEMON_TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const TYPE_INFO: Record<PokemonType, { label: string; color: string; soft: string }> = {
  normal: { label: "Normal", color: "#64675c", soft: "#eeeee7" },
  fighting: { label: "Lucha", color: "#a84442", soft: "#fbe9e4" },
  flying: { label: "Volador", color: "#586790", soft: "#edf0fa" },
  poison: { label: "Veneno", color: "#89529c", soft: "#f4eaf8" },
  ground: { label: "Tierra", color: "#8d6030", soft: "#f7efdf" },
  rock: { label: "Roca", color: "#6e643a", soft: "#f0eddc" },
  bug: { label: "Bicho", color: "#5c6e2b", soft: "#edf3de" },
  ghost: { label: "Fantasma", color: "#695e8f", soft: "#eeebf7" },
  steel: { label: "Acero", color: "#546973", soft: "#e9f0f3" },
  fire: { label: "Fuego", color: "#a3542c", soft: "#fcece0" },
  water: { label: "Agua", color: "#2d6f92", soft: "#e4f1f8" },
  grass: { label: "Planta", color: "#497241", soft: "#eaf2e3" },
  electric: { label: "Eléctrico", color: "#806314", soft: "#faf0c8" },
  psychic: { label: "Psíquico", color: "#964f6c", soft: "#f9e9ef" },
  ice: { label: "Hielo", color: "#396e76", soft: "#e2f3f3" },
  dragon: { label: "Dragón", color: "#6550a4", soft: "#eeebfa" },
  dark: { label: "Siniestro", color: "#665b55", soft: "#eeebe8" },
  fairy: { label: "Hada", color: "#8b5476", soft: "#f8eaf3" },
};

export const STAT_NAMES = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export type StatName = (typeof STAT_NAMES)[number];

export const STAT_LABELS: Record<StatName, string> = {
  hp: "Puntos de salud",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "Ataque especial",
  "special-defense": "Defensa especial",
  speed: "Velocidad",
};

export const pokemonSummarySchema = z.object({
  id: z.number().int().min(1).max(386),
  name: z.string().min(1),
  types: z.array(z.enum(POKEMON_TYPES)).min(1).max(2),
});

export type PokemonSummary = z.infer<typeof pokemonSummarySchema>;

export const pokemonDetailSchema = pokemonSummarySchema.extend({
  height: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  sprite: z.string().url(),
  artwork: z.string().url(),
  animatedSprite: z.string().url().nullable(),
  cry: z.string().url().nullable(),
  description: z.string().nullable(),
  genus: z.string().nullable(),
  legendary: z.boolean(),
  abilities: z.array(z.string()),
  stats: z
    .array(
      z.object({
        name: z.enum(STAT_NAMES),
        value: z.number().int().min(0).max(255),
      }),
    )
    .length(6)
    .refine((stats) => new Set(stats.map((stat) => stat.name)).size === 6),
});

export type PokemonDetail = z.infer<typeof pokemonDetailSchema>;

const DISPLAY_NAMES: Record<string, string> = {
  "nidoran-f": "Nidoran ♀",
  "nidoran-m": "Nidoran ♂",
  "mr-mime": "Mr. Mime",
  farfetchd: "Farfetch’d",
};

export function pokemonName(name: string): string {
  return (
    DISPLAY_NAMES[name] ??
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function pokemonNumber(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function animatedSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
}

export function formatMeasure(value: number, unit: "m" | "kg"): string {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}
