"use client";

import { useQuery } from "@tanstack/react-query";
import { weatherSchema } from "@/lib/weather";
import { weatherCell } from "@/lib/weather-location";
import type { Coordinate } from "@/lib/geography";

export function useWeather(siteId: string, coordinates: Coordinate, enabled = true) {
  const [longitude, latitude] = weatherCell(coordinates);
  return useQuery({
    queryKey: ["weather", siteId, latitude, longitude],
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
      const response = await fetch(`/api/weather/${siteId}?${params}`, { signal });
      if (!response.ok) throw new Error("El clima no está disponible.");
      const raw: unknown = await response.json();
      return weatherSchema.parse(raw);
    },
  });
}
