import { NextResponse } from "next/server";
import { getPokemonDetail, PokemonApiError } from "@/lib/server/pokeapi";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!/^\d{1,3}$/.test(rawId) || !Number.isInteger(id) || id < 1 || id > 386) {
    return NextResponse.json({ error: "Elegí un Pokémon entre el 1 y el 386." }, { status: 400 });
  }
  try {
    const pokemon = await getPokemonDetail(id);
    return NextResponse.json(pokemon, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    const status = error instanceof PokemonApiError ? error.status : 500;
    const message =
      error instanceof PokemonApiError
        ? error.message
        : "No pudimos cargar la ficha. Intentá de nuevo.";
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
