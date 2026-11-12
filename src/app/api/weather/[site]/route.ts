import { z } from "zod";
import { getDestination } from "@/lib/destinations";
import { weatherSchema } from "@/lib/weather";
import { parseWeatherLocation } from "@/lib/weather-location";

const upstreamSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    weather_code: z.number().int(),
    wind_speed_10m: z.number().nonnegative(),
    is_day: z.union([z.literal(0), z.literal(1)]),
  }),
});

export async function GET(request: Request, context: { params: Promise<{ site: string }> }) {
  const { site: id } = await context.params;
  const site = getDestination(id);
  if (!site) return Response.json({ error: "Destino no encontrado." }, { status: 404 });
  const requested = parseWeatherLocation(new URL(request.url).searchParams);
  if (requested === null)
    return Response.json({ error: "Coordenadas inválidas." }, { status: 400 });
  const [longitude, latitude] = requested ?? site.area.center;
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    timezone: "auto",
    forecast_days: "1",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error("Weather unavailable");
    const raw: unknown = await response.json();
    const { current, timezone } = upstreamSchema.parse(raw);
    const weather = weatherSchema.parse({
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      wind: current.wind_speed_10m,
      code: current.weather_code,
      isDay: current.is_day === 1,
      reportedAt: current.time,
      timezone,
    });
    return Response.json(weather, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" },
    });
  } catch {
    return Response.json(
      { error: "No pudimos consultar el clima. La exploración por hábitat sigue disponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
