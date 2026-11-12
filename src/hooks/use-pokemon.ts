"use client";

import { useQuery } from "@tanstack/react-query";
import { pokemonDetailSchema } from "@/lib/pokemon";

export function usePokemon(id: number | null) {
  return useQuery({
    queryKey: ["pokemon", id],
    enabled: id !== null,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/pokemon/${id}`, { signal });
      if (!response.ok) throw new Error("No pudimos cargar esta ficha. Intentá nuevamente.");
      const raw: unknown = await response.json();
      return pokemonDetailSchema.parse(raw);
    },
  });
}
