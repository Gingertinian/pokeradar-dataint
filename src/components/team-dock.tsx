"use client";

import { Backpack } from "lucide-react";
import { Pokeball } from "@/components/ui/pokeball";
import { findPokemon } from "@/lib/catalog";
import { pokemonName } from "@/lib/pokemon";
import { TEAM_LIMIT } from "@/lib/exploration";
import { PokemonImage } from "@/components/ui/pokemon-image";

export function TeamDock({
  team,
  selectedId,
  detailOpen,
  onSelect,
  onOpen,
}: {
  team: number[];
  selectedId: number | null;
  detailOpen: boolean;
  onSelect: (id: number) => void;
  onOpen: () => void;
}) {
  return (
    <div className="team-dock" data-detail-open={detailOpen} aria-label="Equipo de expedición">
      <button
        className="dock-title"
        onClick={onOpen}
        aria-label={`Abrir mi equipo, ${team.length} de ${TEAM_LIMIT} Pokémon`}
      >
        <Backpack size={18} aria-hidden="true" />
        <span>
          Mi equipo
          <small className="mono">
            {team.length} / {TEAM_LIMIT}
          </small>
        </span>
      </button>
      <div className="dock-slots">
        {Array.from({ length: TEAM_LIMIT }, (_, index) => {
          const id = team[index];
          const pokemon = id ? findPokemon(id) : undefined;
          return pokemon ? (
            <button
              className={`dock-slot ${selectedId === pokemon.id ? "is-selected" : ""}`}
              key={pokemon.id}
              aria-label={`Ver a ${pokemonName(pokemon.name)} en mi equipo`}
              onClick={() => onSelect(pokemon.id)}
            >
              <PokemonImage
                id={pokemon.id}
                name={pokemonName(pokemon.name)}
                size={44}
                decorative
                className="pixel-art"
              />
            </button>
          ) : (
            <span className="dock-slot is-empty" key={`empty-${index}`} aria-hidden="true">
              <Pokeball size={23} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
