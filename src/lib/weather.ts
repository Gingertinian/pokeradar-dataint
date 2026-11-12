import { z } from "zod";
import type { PokemonType } from "@/lib/pokemon";

export const weatherSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  wind: z.number().nonnegative(),
  code: z.number().int(),
  isDay: z.boolean(),
  reportedAt: z.string(),
  timezone: z.string(),
});
export type Weather = z.infer<typeof weatherSchema>;
export type WeatherKind = "sun" | "cloud" | "fog" | "rain" | "snow" | "storm";

export function weatherKind(code: number): WeatherKind {
  if (code >= 95) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  return code <= 1 ? "sun" : "cloud";
}

export function weatherLabel(weather: Weather): string {
  const labels: Record<WeatherKind, string> = {
    sun: weather.isDay ? "Despejado" : "Noche despejada",
    cloud: "Nublado",
    fog: "Niebla",
    rain: "Lluvia",
    snow: "Nieve",
    storm: "Tormenta",
  };
  return labels[weatherKind(weather.code)];
}

export function weatherAffinity(weather: Weather | null | undefined): PokemonType[] {
  if (!weather) return [];
  const types: Record<WeatherKind, PokemonType[]> = {
    sun: ["fire", "grass"],
    cloud: ["normal", "flying"],
    fog: ["ghost", "psychic"],
    rain: ["water", "grass"],
    snow: ["ice"],
    storm: ["electric", "water"],
  };
  const base =
    !weather.isDay && weatherKind(weather.code) === "sun" ? [] : types[weatherKind(weather.code)];
  return [...new Set([...base, ...(!weather.isDay ? ["ghost" as const, "dark" as const] : [])])];
}
